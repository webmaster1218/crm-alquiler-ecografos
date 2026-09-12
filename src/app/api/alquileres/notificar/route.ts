import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import {
  getAlertsConfig,
  formatAlertMessage,
  sendEvolutionTextMessage,
  normalizePhoneNumber,
  BookingAlertData
} from '../../../../lib/rentalAlerts';

export const dynamic = 'force-dynamic';

// Headers CORS permisivos para llamadas locales y entre proyectos
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud inválido o ausente.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 1. Obtener la configuración activa de Supabase
    const config = await getAlertsConfig(supabase);

    if (!config.enabled) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Las alertas de WhatsApp están deshabilitadas en la configuración.'
      }, { headers: corsHeaders });
    }

    if (!config.phoneNumbers || config.phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay números destinatarios configurados para las alertas.'
      }, { status: 400, headers: corsHeaders });
    }

    // 2. Extraer y formatear datos de la reserva
    const bookingData: BookingAlertData = {
      client_name: rawBody.client_name,
      client_email: rawBody.client_email,
      client_phone: rawBody.client_phone,
      client_type: rawBody.client_type || 'Cliente Directo',
      document_number: rawBody.document_number,
      tax_id: rawBody.tax_id,
      full_address: rawBody.full_address || rawBody.client_address,
      start_date: rawBody.start_date,
      end_date: rawBody.end_date,
      delivery_time: rawBody.delivery_time,
      collection_time: rawBody.collection_time,
      total_days: rawBody.total_days || rawBody.duration || 1,
      equipment_summary: rawBody.equipment_summary,
      total_price: rawBody.total_price,
      created_at: rawBody.created_at || new Date().toISOString(),
    };

    // 3. Generar el mensaje final sustituyendo etiquetas
    const messageText = formatAlertMessage(config.messageTemplate, bookingData);

    // 4. Enviar mensaje a cada número configurado
    const dispatchResults: Array<{ phone: string; success: boolean; error?: string }> = [];

    for (const rawPhone of config.phoneNumbers) {
      const normalized = normalizePhoneNumber(rawPhone);
      if (!normalized) continue;

      const sendResult = await sendEvolutionTextMessage({
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        instanceName: config.instanceName,
        number: normalized,
        text: messageText,
      });

      dispatchResults.push({
        phone: rawPhone,
        success: sendResult.success,
        error: sendResult.error,
      });
    }

    const anySent = dispatchResults.some(r => r.success);

    return NextResponse.json({
      success: anySent,
      totalSent: dispatchResults.filter(r => r.success).length,
      results: dispatchResults,
      message: anySent
        ? 'Alertas de reserva enviadas por WhatsApp correctamente.'
        : 'Ocurrieron errores al enviar las alertas por WhatsApp.',
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in notificar endpoint:', err);
    return NextResponse.json({
      error: 'Error procesando la notificación de reserva.',
      message: err.message
    }, { status: 500, headers: corsHeaders });
  }
}
