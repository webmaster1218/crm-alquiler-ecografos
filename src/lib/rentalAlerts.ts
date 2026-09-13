import { SupabaseClient } from '@supabase/supabase-js';

export interface RentalAlertsConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  phoneNumbers: string[];
  messageTemplate: string;
}

export interface BookingAlertData {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_type?: string;
  document_number?: string;
  tax_id?: string;
  full_address?: string;
  start_date?: string;
  end_date?: string;
  delivery_time?: string;
  collection_time?: string;
  total_days?: number | string;
  equipment_summary?: string;
  total_price?: number | string;
  created_at?: string;
}

export const DEFAULT_ALERT_TEMPLATE = `📢 Nueva reserva — Alquiler de Ecógrafos

🗓 Fecha de solicitud:
{{fecha_solicitud}}

-----------------------------------

👤 INFORMACIÓN DEL CLIENTE
Nombre: {{client_name}}
Documento: {{document_number}}
Tipo: {{client_type}}
Teléfono: {{client_phone}}
RUT Facturación: {{tax_id}}
Correo: {{client_email}}

-----------------------------------

📍 ENTREGA DEL EQUIPO
Dirección: {{full_address}}
Fecha de entrega: {{start_date}}
Hora de entrega: {{delivery_time}}

-----------------------------------

🔄 RECOGIDA DEL EQUIPO
Fecha de recogida: {{end_date}}
Hora de recogida: {{collection_time}}

-----------------------------------

📆 DETALLES DEL ALQUILER
Total de días: {{total_days}}

-----------------------------------

🖥 EQUIPO ALQUILADO
{{equipment_summary}}

-----------------------------------

💰 VALOR TOTAL
{{total_price}}`;

export const DEFAULT_ALERT_CONFIG: RentalAlertsConfig = {
  enabled: true,
  apiUrl: 'https://evolucion.telocalizo.co',
  apiKey: '92F2215F3451-48C5-8A45-325D1D9F8EC5',
  instanceName: 'Jhon',
  phoneNumbers: ['+573005212664'],
  messageTemplate: DEFAULT_ALERT_TEMPLATE,
};

export const SETTINGS_KEY = 'rental_alerts_config';

/**
 * Obtiene la configuración de alertas desde Supabase o devuelve los valores por defecto
 */
export async function getAlertsConfig(supabaseClient: SupabaseClient): Promise<RentalAlertsConfig> {
  try {
    const { data, error } = await supabaseClient
      .from('equipment_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (error || !data?.value) {
      return DEFAULT_ALERT_CONFIG;
    }

    return {
      ...DEFAULT_ALERT_CONFIG,
      ...data.value,
      phoneNumbers: Array.isArray(data.value.phoneNumbers)
        ? data.value.phoneNumbers
        : DEFAULT_ALERT_CONFIG.phoneNumbers,
    };
  } catch (err) {
    console.error('Error fetching alerts config:', err);
    return DEFAULT_ALERT_CONFIG;
  }
}

/**
 * Guarda o actualiza la configuración de alertas en Supabase
 */
export async function saveAlertsConfig(supabaseClient: SupabaseClient, config: RentalAlertsConfig): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar si ya existe el registro
    const { data: existing } = await supabaseClient
      .from('equipment_settings')
      .select('id')
      .eq('key', SETTINGS_KEY)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseClient
        .from('equipment_settings')
        .update({
          value: config,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from('equipment_settings')
        .insert([{
          key: SETTINGS_KEY,
          value: config,
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving alerts config:', err);
    return { success: false, error: err.message || 'Error guardando configuración' };
  }
}

/**
 * Limpia y normaliza un número de teléfono a formato internacional de dígitos (ej: 573005212664)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    // Número colombiano sin código de país
    cleaned = `57${cleaned}`;
  }
  return cleaned;
}

/**
 * Reemplaza las variables en la plantilla con los datos reales de la reserva
 */
export function formatAlertMessage(template: string, data: BookingAlertData): string {
  const now = new Date();
  const dateFormatted = now.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const formattedPrice = typeof data.total_price === 'number'
    ? `$${data.total_price.toLocaleString('es-CO')} COP`
    : (data.total_price || '$0 COP');

  const replacements: Record<string, string> = {
    '{{fecha_solicitud}}': dateFormatted,
    '{{client_name}}': data.client_name || 'No especificado',
    '{{document_number}}': data.document_number || 'No especificado',
    '{{client_type}}': data.client_type || 'Cliente Directo',
    '{{client_phone}}': data.client_phone || 'No especificado',
    '{{tax_id}}': data.tax_id || 'N/A',
    '{{client_email}}': data.client_email || 'No especificado',
    '{{full_address}}': data.full_address || 'Por coordinar',
    '{{start_date}}': data.start_date || 'No especificada',
    '{{delivery_time}}': data.delivery_time || 'Por coordinar',
    '{{end_date}}': data.end_date || 'No especificada',
    '{{collection_time}}': data.collection_time || 'Por coordinar',
    '{{total_days}}': String(data.total_days || 1),
    '{{equipment_summary}}': data.equipment_summary || 'Equipo no especificado',
    '{{total_price}}': formattedPrice,
  };

  let message = template;
  for (const [tag, val] of Object.entries(replacements)) {
    message = message.replaceAll(tag, val);
  }

  return message;
}

/**
 * Envía un mensaje de texto a través de Evolution API v2
 */
export async function sendEvolutionTextMessage(params: {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  number: string;
  text: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const cleanUrl = params.apiUrl.replace(/\/$/, '');
    const cleanNumber = normalizePhoneNumber(params.number);
    const endpoint = `${cleanUrl}/message/sendText/${params.instanceName}`;

    const body = {
      number: cleanNumber,
      text: params.text,
      options: {
        delay: 1000,
        presence: 'composing',
        linkPreview: false,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': params.apiKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        error: data?.response?.message || data?.message || `HTTP ${res.status}: ${res.statusText}`,
        data,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de red con Evolution API' };
  }
}
