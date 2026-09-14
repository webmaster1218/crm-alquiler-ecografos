import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabase } from '@/lib/supabaseClient';
import { ApiKeyRecord } from '@/lib/apiKeyAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client no configurado' }, { status: 500 });
    }

    const { data, error } = await supabase
      .from('configuracion_equipos')
      .select('valor')
      .eq('clave', 'api_keys')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const keys: ApiKeyRecord[] = Array.isArray(data?.valor) ? data.valor : [];
    return NextResponse.json({ keys });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/keys:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client no configurado' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const name = (body.name || '').trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'El nombre de la API Key es requerido (mínimo 2 caracteres)' }, { status: 400 });
    }

    // Generar clave segura estilo Stripe: eco_live_xxxx...
    const randomHex = crypto.randomBytes(16).toString('hex');
    const newGeneratedKey = `eco_live_${randomHex}`;

    const newRecord: ApiKeyRecord = {
      id: crypto.randomUUID(),
      name,
      key: newGeneratedKey,
      created_at: new Date().toISOString(),
      active: true,
    };

    // Obtener las claves existentes
    const { data } = await supabase
      .from('configuracion_equipos')
      .select('valor')
      .eq('clave', 'api_keys')
      .single();

    const existingKeys: ApiKeyRecord[] = Array.isArray(data?.valor) ? data.valor : [];
    const updatedKeys = [newRecord, ...existingKeys];

    const { error: upsertError } = await supabase
      .from('configuracion_equipos')
      .upsert({
        clave: 'api_keys',
        valor: updatedKeys,
        actualizado_en: new Date().toISOString()
      }, { onConflict: 'clave' });

    if (upsertError) {
      console.error('Error saving new API key:', upsertError);
      return NextResponse.json({ error: 'Error al guardar la clave' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      key: newRecord
    });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/keys:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client no configurado' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de clave requerido' }, { status: 400 });
    }

    const { data } = await supabase
      .from('configuracion_equipos')
      .select('valor')
      .eq('clave', 'api_keys')
      .single();

    const existingKeys: ApiKeyRecord[] = Array.isArray(data?.valor) ? data.valor : [];
    const updatedKeys = existingKeys.filter(k => k.id !== id);

    const { error: upsertError } = await supabase
      .from('configuracion_equipos')
      .upsert({
        clave: 'api_keys',
        valor: updatedKeys,
        actualizado_en: new Date().toISOString()
      }, { onConflict: 'clave' });

    if (upsertError) {
      console.error('Error deleting API key:', upsertError);
      return NextResponse.json({ error: 'Error al eliminar la clave' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Clave revocada correctamente' });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/keys:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
