/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Role = 'Superadmin' | 'Administrador' | 'Supervisor' | 'Agente';
export type UserStatus = 'En línea' | 'Ocupado' | 'Ausente' | 'Desconectado';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatar?: string;
  activeConversations: number;
  lastAccess: string;
}

export type ContactStatus = 'Cliente activo' | 'Prospecto' | 'Lead' | 'Perdido' | 'Inactivo';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  phone: string;
  email: string;
  status: ContactStatus;
  agentId: string;
  score: number;
  tags: string[];
  city: string;
  country: string;
  createdAt: string;
}

export type DealStage = 'Nuevo lead' | 'Contactado' | 'Propuesta enviada' | 'Negociación' | 'Cerrado ganado' | 'Cerrado perdido';

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  value: number;
  probability: number;
  stage: DealStage;
  estimatedCloseDate: string;
  responsibleId: string;
  description?: string;
}

export type MessageChannel = 'WhatsApp' | 'Email' | 'Web Chat' | 'Instagram' | 'Facebook';
export type MessageStatus = 'Abierta' | 'En espera' | 'Resuelta';

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isInternal?: boolean;
}

export interface Conversation {
  id: string;
  contactId: string;
  channel: MessageChannel;
  status: MessageStatus;
  assignedTo: string;
  messages: Message[];
  priority?: 'Baja' | 'Media' | 'Alta';
}

export type TaskPriority = 'Baja' | 'Media' | 'Alta';
export type TaskStatus = 'Pendiente' | 'En progreso' | 'Completada';

export interface Task {
  id: string;
  title: string;
  contactId?: string;
  dealId?: string;
  dueDate: string;
  priority: TaskPriority;
  assignedId: string;
  status: TaskStatus;
  description?: string;
}

export interface RentalBooking {
  id: string | number;
  created_at?: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  client_address: string;
  client_type?: 'medico' | 'clinica' | 'ips' | 'otro';
  document_number?: string;
  tax_id?: string;
  start_date: string;
  end_date: string;
  delivery_time?: string;
  collection_time?: string;
  quantity_z6: number;
  quantity_z60: number;
  quantity_m7: number;
  quantity_mx3: number;
  include_cart?: boolean;
  include_printer?: boolean;
  selected_transducers?: string[];
  total_price: number | string;
  status: 'pending_confirmation' | 'confirmed' | 'in_transit' | 'delivered' | 'completed' | 'cancelled' | 'maintenance';
  notes?: string;
  signed_contract_url?: string;
  payment_receipt_url?: string;
  serial_numbers?: string;
}

export const BOOKING_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  pending_confirmation: { label: 'Por confirmar', class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  confirmed: { label: 'Confirmado', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  in_transit: { label: 'En camino', class: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  delivered: { label: 'Entregado / Activo', class: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  completed: { label: 'Completado', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  cancelled: { label: 'Cancelado', class: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  maintenance: { label: 'Mantenimiento', class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
};

