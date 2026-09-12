import { NextRequest, NextResponse } from 'next/server';
import { sendEvolutionTextMessage, normalizePhoneNumber } from '../../../../lib/rentalAlerts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 });
    }

    const { apiUrl, apiKey, instanceName, phoneNumbers, messageText } = body;

    if (!apiUrl || !apiKey || !instanceName) {
      return NextResponse.json({
        error: 'Faltan credenciales de Evolution API (URL, apiKey o nombre de instancia).'
      }, { status: 400 });
    }

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json({
        error: 'Debes especificar al menos un número de teléfono de destino.'
      }, { status: 400 });
    }

    const textToSend = messageText || '🔔 Mensaje de prueba desde el CRM de Alquiler de Ecógrafos. Conexión con Evolution API exitosa.';

    const results: Array<{ phone: string; success: boolean; error?: string }> = [];

    for (const rawPhone of phoneNumbers) {
      const normalized = normalizePhoneNumber(rawPhone);
      if (!normalized) continue;

      const sendResult = await sendEvolutionTextMessage({
        apiUrl,
        apiKey,
        instanceName,
        number: normalized,
        text: textToSend,
      });

      results.push({
        phone: rawPhone,
        success: sendResult.success,
        error: sendResult.error,
      });
    }

    const allSuccessful = results.every(r => r.success);
    const someSuccessful = results.some(r => r.success);

    return NextResponse.json({
      success: someSuccessful,
      allSuccessful,
      results,
      message: allSuccessful
        ? `Mensaje de prueba enviado exitosamente a ${results.length} destinatario(s).`
        : `Se enviaron algunos mensajes pero hubo errores en otros.`,
    });
  } catch (error: any) {
    console.error('Error in test-whatsapp endpoint:', error);
    return NextResponse.json({
      error: 'Error procesando la prueba de WhatsApp.',
      details: error.message
    }, { status: 500 });
  }
}
