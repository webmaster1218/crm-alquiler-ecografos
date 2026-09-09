import { z } from 'zod';

/**
 * Sanitized string validator:
 * - Rejects HTML tags (<, >)
 * - Rejects template brackets ({, })
 * - Rejects CRLF line breaks (\r, \n)
 */
export const cleanSafeString = (min: number, max: number, fieldName: string = 'Texto') =>
  z.string()
    .trim()
    .min(min, `${fieldName} debe tener al menos ${min} caracteres.`)
    .max(max, `${fieldName} no puede exceder los ${max} caracteres.`)
    .refine(
      (val) => !/[<>{}\r\n]/.test(val),
      `${fieldName} contiene caracteres no permitidos (HTML, plantillas o saltos de línea).`
    );

export const safeEmailSchema = z.string()
  .trim()
  .email('Correo electrónico inválido.')
  .max(100, 'El correo es demasiado largo.')
  .refine((val) => !/[\r\n<>{}\\]/.test(val), 'Correo con formato no permitido.')
  .or(z.literal(''));

export const safePhoneSchema = z.string()
  .trim()
  .max(30)
  .regex(/^[0-9+\s()-]*$/, 'Teléfono con formato no permitido.')
  .optional()
  .default('');

/**
 * Esquema de validación para creación y edición de reservas desde el CRM o API
 */
export const AdminBookingSchema = z.object({
  client_name: cleanSafeString(2, 120, 'Nombre del cliente'),
  client_phone: safePhoneSchema,
  client_email: safeEmailSchema.optional().default(''),
  client_address: z.string().trim().max(250).refine((val) => !/[<>{}\r\n]/.test(val), 'Dirección inválida.').optional().default(''),
  client_type: z.string().trim().max(50).optional().default('medico'),
  document_number: z.string().trim().max(30).regex(/^[a-zA-Z0-9.-]*$/, 'Documento inválido').optional().default(''),
  tax_id: z.string().trim().max(30).optional().default(''),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (YYYY-MM-DD)'),
  delivery_time: z.string().trim().max(50).optional().default(''),
  collection_time: z.string().trim().max(50).optional().default(''),
  quantity_z6: z.number().int().min(0).max(20).optional().default(0),
  quantity_z60: z.number().int().min(0).max(20).optional().default(0),
  quantity_m7: z.number().int().min(0).max(20).optional().default(0),
  quantity_mx3: z.number().int().min(0).max(20).optional().default(0),
  include_cart: z.boolean().optional().default(false),
  include_printer: z.boolean().optional().default(false),
  selected_transducers: z.array(z.string().trim().max(50)).optional().default([]),
  status: z.string().trim().max(40).optional().default('pending_confirmation'),
  total_price: z.number().min(0).optional(),
  notes: z.string().trim().max(1000).refine((val) => !/[<>{}]/.test(val), 'Notas contienen caracteres no permitidos.').optional().default('')
}).passthrough();

export type AdminBookingData = z.infer<typeof AdminBookingSchema>;
