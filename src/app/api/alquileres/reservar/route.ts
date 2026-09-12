import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { calculateDays, calculateTotalPrice } from '../../../../lib/pricing';
import { AdminBookingSchema } from '../../../../lib/validations/alquileres';
import {
  getAlertsConfig,
  formatAlertMessage,
  sendEvolutionTextMessage,
  normalizePhoneNumber
} from '../../../../lib/rentalAlerts';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Cuerpo de solicitud inválido o ausente.' },
        { status: 400 }
      );
    }

    // Validación defensiva con Zod
    const parseResult = AdminBookingSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.issues.map((e) => e.message);
      return NextResponse.json(
        {
          error: 'Datos de la reserva inválidos.',
          details: errorMessages,
        },
        { status: 400 }
      );
    }

    const {
      client_name,
      client_phone,
      client_email = '',
      client_address = '',
      document_number = '',
      tax_id = '',
      start_date,
      end_date,
      quantity_z6 = 0,
      quantity_z60 = 0,
      quantity_m7 = 0,
      quantity_mx3 = 0,
      include_cart = false,
      include_printer = false,
      selected_transducers = [],
      status = 'pending_confirmation',
      notes = ''
    } = parseResult.data;

    // Calculate duration & price if not explicitly supplied
    const days = calculateDays(start_date, end_date);
    const calculatedPrice = calculateTotalPrice({
      quantityZ6: Number(quantity_z6),
      quantityZ60: Number(quantity_z60),
      quantityM7: Number(quantity_m7),
      quantityMx3: Number(quantity_mx3),
      includeCart: !!include_cart,
      includePrinter: !!include_printer,
      days: days,
      includeShipping: true
    });

    const payload = {
      client_name,
      client_phone,
      client_email,
      client_address,
      document_number,
      tax_id,
      start_date,
      end_date,
      quantity_z6: Number(quantity_z6),
      quantity_z60: Number(quantity_z60),
      quantity_m7: Number(quantity_m7),
      quantity_mx3: Number(quantity_mx3),
      include_cart: !!include_cart,
      include_printer: !!include_printer,
      selected_transducers,
      status,
      notes,
      total_price: parseResult.data.total_price ? Number(parseResult.data.total_price) : calculatedPrice
    };

    let { data, error } = await supabase
      .from('bookings')
      .insert([payload])
      .select();

    if (error && (error.message?.includes('quantity_mx3') || error.code === 'PGRST204')) {
      const fallbackPayload = { ...payload };
      delete (fallbackPayload as any).quantity_mx3;
      if (Number(quantity_mx3) > 0) {
        fallbackPayload.notes = (fallbackPayload.notes ? fallbackPayload.notes + ' | ' : '') + `MX3: ${quantity_mx3}`;
      }
      const res = await supabase.from('bookings').insert([fallbackPayload]).select();
      data = res.data;
      error = res.error;
    }

    if (error) {
      throw error;
    }

    // Disparar alertas de WhatsApp de forma asíncrona si están habilitadas
    (async () => {
      try {
        const config = await getAlertsConfig(supabase);
        if (config.enabled && config.phoneNumbers?.length > 0) {
          const summary = [];
          if (payload.quantity_z6 > 0) summary.push(`ECOGRAFO Z6 (${payload.quantity_z6})`);
          if (payload.quantity_z60 > 0) summary.push(`ECOGRAFO Z60 (${payload.quantity_z60})`);
          if (payload.quantity_m7 > 0) summary.push(`ECOGRAFO M7 (${payload.quantity_m7})`);
          if (Number(quantity_mx3) > 0) summary.push(`ECOGRAFO MX3 (${quantity_mx3})`);
          if (payload.include_cart) summary.push('CARRITO');
          if (payload.include_printer) summary.push('IMPRESORA');

          const messageText = formatAlertMessage(config.messageTemplate, {
            client_name: payload.client_name,
            client_email: payload.client_email,
            client_phone: payload.client_phone,
            client_type: 'Admin CRM',
            document_number: payload.document_number,
            tax_id: payload.tax_id,
            full_address: payload.client_address,
            start_date: payload.start_date,
            end_date: payload.end_date,
            delivery_time: 'A convenir',
            collection_time: 'A convenir',
            total_days: days,
            equipment_summary: summary.join('\n') || 'Alquiler administrativo',
            total_price: payload.total_price,
          });

          for (const rawNumber of config.phoneNumbers) {
            const cleanNumber = normalizePhoneNumber(rawNumber);
            if (cleanNumber) {
              await sendEvolutionTextMessage({
                apiUrl: config.apiUrl,
                apiKey: config.apiKey,
                instanceName: config.instanceName,
                number: cleanNumber,
                text: messageText,
              });
            }
          }
        }
      } catch (alertErr) {
        console.error('Error sending whatsapp alert from admin reserve:', alertErr);
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Reserva creada con éxito',
      booking: data?.[0]
    });
  } catch (err: any) {
    console.error('Error in reserving API:', err);
    return NextResponse.json(
      { error: 'Error al procesar la reserva', message: err.message },
      { status: 500 }
    );
  }
}
