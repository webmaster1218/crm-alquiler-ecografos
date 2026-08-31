import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import { calculateDays, calculateTotalPrice } from '../../../../lib/pricing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

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
    } = body;

    if (!client_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: client_name, start_date y end_date' },
        { status: 400 }
      );
    }

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
      total_price: body.total_price ? Number(body.total_price) : calculatedPrice
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert([payload])
      .select();

    if (error) {
      throw error;
    }

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
