import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';
import {
  getAlertsConfig,
  saveAlertsConfig,
  RentalAlertsConfig,
  DEFAULT_ALERT_CONFIG,
  normalizePhoneNumber
} from '../../../../lib/rentalAlerts';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  try {
    const config = await getAlertsConfig(supabase);
    return NextResponse.json({
      success: true,
      config,
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error fetching alerts config:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      config: DEFAULT_ALERT_CONFIG
    }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({
        success: false,
        error: 'Cuerpo de solicitud inválido.'
      }, { status: 400, headers: corsHeaders });
    }

    // Normalizar y limpiar lista de números telefónicos
    const rawPhones: string[] = Array.isArray(body.phoneNumbers) ? body.phoneNumbers : [];
    const cleanPhones: string[] = [];

    for (const p of rawPhones) {
      if (typeof p === 'string' && p.trim().length > 0) {
        const trimmed = p.trim();
        // Asegurar que comience con + si tiene formato internacional
        const formatted = trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/[^0-9]/g, '')}`;
        if (!cleanPhones.includes(formatted)) {
          cleanPhones.push(formatted);
        }
      }
    }

    const newConfig: RentalAlertsConfig = {
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
      apiUrl: body.apiUrl ? String(body.apiUrl).trim() : DEFAULT_ALERT_CONFIG.apiUrl,
      apiKey: body.apiKey ? String(body.apiKey).trim() : DEFAULT_ALERT_CONFIG.apiKey,
      instanceName: body.instanceName ? String(body.instanceName).trim() : DEFAULT_ALERT_CONFIG.instanceName,
      phoneNumbers: cleanPhones,
      messageTemplate: body.messageTemplate ? String(body.messageTemplate) : DEFAULT_ALERT_CONFIG.messageTemplate,
    };

    const saveResult = await saveAlertsConfig(supabase, newConfig);

    if (!saveResult.success) {
      return NextResponse.json({
        success: false,
        error: saveResult.error || 'Error guardando en Supabase'
      }, { status: 500, headers: corsHeaders });
    }

    // Re-leer para verificar lo que realmente quedó persistido en la BD
    const verifiedConfig = await getAlertsConfig(supabase);

    return NextResponse.json({
      success: true,
      message: `Configuración guardada exitosamente con ${verifiedConfig.phoneNumbers.length} número(s) de destino.`,
      config: verifiedConfig
    }, { headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in POST /api/alquileres/config:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Error interno guardando configuración.'
    }, { status: 500, headers: corsHeaders });
  }
}
