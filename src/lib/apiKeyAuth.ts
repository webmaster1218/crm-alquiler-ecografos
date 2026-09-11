import { supabase } from './supabaseClient';

export interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  created_at: string;
  active: boolean;
  last_used_at?: string;
}

/**
 * Valida la cabecera Authorization (Bearer) o x-api-key contra las API Keys registradas en Supabase.
 */
export async function validateApiKey(req: Request): Promise<{ valid: boolean; keyName?: string; error?: string }> {
  const authHeader = req.headers.get('authorization') || '';
  const xApiKey = req.headers.get('x-api-key') || '';

  let token = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (xApiKey) {
    token = xApiKey.trim();
  }

  if (!token) {
    return {
      valid: false,
      error: 'Se requiere API Key en el encabezado Authorization: Bearer <key> o x-api-key'
    };
  }

  try {
    if (!supabase) {
      return { valid: false, error: 'Servicio de base de datos no disponible' };
    }

    const { data, error } = await supabase
      .from('equipment_settings')
      .select('value')
      .eq('key', 'api_keys')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[API Key Auth] Error al consultar API keys:', error);
    }

    const keys: ApiKeyRecord[] = Array.isArray(data?.value) ? data.value : [];
    const matchedKey = keys.find(k => k.active && k.key === token);

    if (matchedKey) {
      return { valid: true, keyName: matchedKey.name };
    }
  } catch (err) {
    console.error('[API Key Auth] Excepción al validar API Key:', err);
  }

  return {
    valid: false,
    error: 'API Key inválida, inactiva o revocada.'
  };
}
