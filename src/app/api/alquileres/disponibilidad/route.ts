import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/availability';
import { validateApiKey } from '@/lib/apiKeyAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Validación de seguridad por API Key
    const authCheck = await validateApiKey(request);
    if (!authCheck.valid) {
      return NextResponse.json(
        { error: authCheck.error || 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const excludeId = searchParams.get('excludeId') || undefined;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos: startDate y endDate' },
        { status: 400 }
      );
    }

    const availability = await checkAvailability(startDate, endDate, excludeId);
    
    return NextResponse.json(availability);
  } catch (err: any) {
    console.error('Error in availability API:', err);
    return NextResponse.json(
      { error: 'Error al consultar disponibilidad', message: err.message },
      { status: 500 }
    );
  }
}
