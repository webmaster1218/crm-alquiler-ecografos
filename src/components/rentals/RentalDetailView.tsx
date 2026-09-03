"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Calendar, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  Clock, 
  FileText, 
  DollarSign, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck,
  Tag,
  Stethoscope,
  Building2,
  FileSpreadsheet,
  Send,
  Trash2,
  Edit3,
  Check
} from 'lucide-react';
import { Button } from '../shared/Button';
import { supabase } from '../../lib/supabaseClient';
import { BOOKING_STATUS_CONFIG, RentalBooking } from '../../types';
import PDFGenWrapper from '../pdf/PDFGenWrapper';
import Swal from 'sweetalert2';

interface RentalDetailViewProps {
  bookingId: string | number;
  onBack: () => void;
  onUpdated?: () => void;
}

export function RentalDetailView({ bookingId, onBack, onUpdated }: RentalDetailViewProps) {
  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<'equipment' | 'client' | 'financial' | 'documents'>('equipment');
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Inline editing for serial numbers
  const [editingSerials, setEditingSerials] = useState(false);
  const [serialsValue, setSerialsValue] = useState('');
  const [savingSerials, setSavingSerials] = useState(false);

  // Notes and comments
  const [notesList, setNotesList] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  // Contract & Receipt uploads
  const [uploadingDoc, setUploadingDoc] = useState<'contract' | 'receipt' | null>(null);


  const fetchBooking = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;

      if (data) {
        setBooking(data);
        setSerialsValue(data.serial_numbers || '');
        
        // Parse notes/comments
        try {
          if (data.notes && data.notes.startsWith('[')) {
            setNotesList(JSON.parse(data.notes));
          } else if (data.notes) {
            setNotesList([{ text: data.notes, date: data.created_at || new Date().toISOString() }]);
          } else {
            setNotesList([]);
          }
        } catch (e) {
          setNotesList(data.notes ? [{ text: data.notes, date: new Date().toISOString() }] : []);
        }
      }
    } catch (err: any) {
      console.error('Error fetching booking details:', err);
      Swal.fire('Error', 'No se pudo cargar la información del alquiler.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;
    setSavingStatus(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', booking.id);

      if (error) throw error;

      setBooking((prev: any) => ({ ...prev, status: newStatus }));
      Swal.fire({
        icon: 'success',
        title: 'Estado actualizado',
        text: `El alquiler ahora está en estado: ${BOOKING_STATUS_CONFIG[newStatus]?.label || newStatus}`,
        timer: 1800,
        showConfirmButton: false
      });
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'No se pudo actualizar el estado.', 'error');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveSerials = async () => {
    if (!booking) return;
    setSavingSerials(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ serial_numbers: serialsValue })
        .eq('id', booking.id);

      if (error) throw error;

      setBooking((prev: any) => ({ ...prev, serial_numbers: serialsValue }));
      setEditingSerials(false);
      Swal.fire({
        icon: 'success',
        title: 'Números de serie guardados',
        timer: 1500,
        showConfirmButton: false
      });
      if (onUpdated) onUpdated();
    } catch (err: any) {
      Swal.fire('Error', 'No se pudieron guardar los números de serie', 'error');
    } finally {
      setSavingSerials(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !booking) return;
    const updatedNotes = [
      ...notesList,
      { text: newNote.trim(), date: new Date().toISOString() }
    ];

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ notes: JSON.stringify(updatedNotes) })
        .eq('id', booking.id);

      if (error) throw error;

      setNotesList(updatedNotes);
      setNewNote('');
    } catch (err: any) {
      Swal.fire('Error', 'No se pudo agregar la nota.', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'receipt') => {
    const file = e.target.files?.[0];
    if (!file || !booking) return;

    setUploadingDoc(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${booking.id}_${type}_${Date.now()}.${fileExt}`;
      const bucket = 'booking-documents';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const updateField = type === 'contract' ? 'signed_contract_url' : 'payment_receipt_url';

      const { error: dbError } = await supabase
        .from('bookings')
        .update({ [updateField]: publicUrl })
        .eq('id', booking.id);

      if (dbError) throw dbError;

      setBooking((prev: any) => ({ ...prev, [updateField]: publicUrl }));
      Swal.fire('Éxito', `${type === 'contract' ? 'Contrato' : 'Comprobante'} subido correctamente.`, 'success');
      if (onUpdated) onUpdated();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'No se pudo subir el archivo.', 'error');
    } finally {
      setUploadingDoc(null);
    }
  };

  const formatPrice = (val: any) => {
    const num = Number(val) || 0;
    return '$' + num.toLocaleString('es-CO');
  };

  const calculateDays = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-brand" size={32} />
        <p className="text-text-muted font-medium text-sm">Cargando detalles del alquiler...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
        <p className="text-rose-500 font-bold">No se encontró el alquiler solicitado</p>
        <Button onClick={onBack} variant="outline">Volver al listado</Button>
      </div>
    );
  }

  const daysCount = calculateDays(booking.start_date, booking.end_date);
  const statusCfg = BOOKING_STATUS_CONFIG[booking.status] || { label: booking.status, class: 'bg-slate-500/10 text-slate-400' };

  return (
    <div className="w-full animate-in fade-in duration-300 pb-12">
      
      {/* ─── HERO HEADER (Estilo OrderDetailView) ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl mx-4 md:mx-6 mt-2 mb-6 shadow-2xl border border-white/5">
        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative px-6 md:px-8 pt-6 pb-6">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors mb-4 cursor-pointer"
          >
            <ArrowLeft size={16} /> Volver a Alquileres
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Title & Info */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-mono font-bold bg-white/10 text-blue-400 px-3 py-1 rounded-lg border border-white/10">
                  ALQ-#{booking.id}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-lg border ${statusCfg.class}`}>
                  {statusCfg.label}
                </span>
                {booking.payment_receipt_url ? (
                  <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Pago Verificado
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Clock size={13} /> Pago Pendiente
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                {booking.client_name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-blue-400" />
                  {booking.start_date} al {booking.end_date} ({daysCount} {daysCount === 1 ? 'día' : 'días'})
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-400" />
                  {booking.client_address || 'Medellín / Área Metrop.'}
                </span>
                {booking.client_phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone size={14} className="text-purple-400" />
                    {booking.client_phone}
                  </span>
                )}
              </div>
            </div>

            {/* Total Price Card & Quick Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <div className="pr-4 sm:border-r border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-white/50 block">Monto Total</span>
                <span className="text-2xl font-black text-white font-mono">{formatPrice(booking.total_price)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={booking.status}
                  disabled={savingStatus}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="bg-slate-800 border border-white/20 text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 cursor-pointer"
                >
                  <option value="pending_confirmation">Por confirmar</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="in_transit">En camino</option>
                  <option value="delivered">Entregado / Activo</option>
                  <option value="completed">Completado</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="cancelled">Cancelado</option>
                </select>

                <button
                  onClick={fetchBooking}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Recargar datos"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 md:px-8 border-t border-white/10 flex gap-2 overflow-x-auto scrollbar-none bg-black/20">
          <button
            onClick={() => setActiveTab('equipment')}
            className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'equipment' ? 'border-blue-400 text-white' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Stethoscope size={15} /> Equipos & Accesorios
          </button>
          <button
            onClick={() => setActiveTab('client')}
            className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'client' ? 'border-blue-400 text-white' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <User size={15} /> Datos del Cliente
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'financial' ? 'border-blue-400 text-white' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <DollarSign size={15} /> Finanzas & Pagos
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'documents' ? 'border-blue-400 text-white' : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <FileText size={15} /> Documentos & Notas
          </button>
        </div>
      </div>

      {/* ─── TAB CONTENT PANELS ─── */}
      <div className="px-4 md:px-6">
        
        {/* 1. EQUIPOS & ACCESORIOS */}
        {activeTab === 'equipment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                  <Stethoscope className="text-brand" size={18} /> Equipos Médicos Contratados
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {booking.quantity_z6 > 0 && (
                    <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-blue-500 uppercase tracking-wider">Mindray Z6</span>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">Ecógrafo Portátil Dopler Color</p>
                      </div>
                      <span className="text-xl font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-xl">
                        {booking.quantity_z6}x
                      </span>
                    </div>
                  )}

                  {booking.quantity_z60 > 0 && (
                    <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-indigo-500 uppercase tracking-wider">Mindray Z60</span>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">Ecógrafo Portátil Alta Gama</p>
                      </div>
                      <span className="text-xl font-black text-indigo-500 bg-indigo-500/10 px-3 py-1 rounded-xl">
                        {booking.quantity_z60}x
                      </span>
                    </div>
                  )}

                  {booking.quantity_m7 > 0 && (
                    <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-purple-500 uppercase tracking-wider">Mindray M7</span>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">Cardiología / Vascular Avanzado</p>
                      </div>
                      <span className="text-xl font-black text-purple-500 bg-purple-500/10 px-3 py-1 rounded-xl">
                        {booking.quantity_m7}x
                      </span>
                    </div>
                  )}

                  {booking.quantity_mx3 > 0 && (
                    <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-emerald-500 uppercase tracking-wider">Mindray MX3</span>
                        <p className="text-sm font-semibold text-text-primary mt-0.5">Ecógrafo Portátil Ultraligero</p>
                      </div>
                      <span className="text-xl font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl">
                        {booking.quantity_mx3}x
                      </span>
                    </div>
                  )}

                  {(!booking.quantity_z6 && !booking.quantity_z60 && !booking.quantity_m7 && !booking.quantity_mx3) && (
                    <div className="col-span-2 p-6 text-center text-text-muted text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      Bloqueo técnico / Mantenimiento de equipo
                    </div>
                  )}
                </div>

                {/* Accesorios y Transductores */}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/60">
                  <h4 className="text-xs font-black text-text-muted uppercase tracking-wider mb-3">Accesorios incluidos</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      booking.include_cart 
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                        : 'bg-slate-100 dark:bg-slate-800/40 text-text-muted border-slate-200 dark:border-slate-800'
                    }`}>
                      {booking.include_cart ? '✓ Carro de Transporte' : 'Sin Carro'}
                    </span>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                      booking.include_printer 
                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                        : 'bg-slate-100 dark:bg-slate-800/40 text-text-muted border-slate-200 dark:border-slate-800'
                    }`}>
                      {booking.include_printer ? '✓ Impresora Sony Térmica' : 'Sin Impresora'}
                    </span>

                    {booking.selected_transducers && booking.selected_transducers.length > 0 && booking.selected_transducers.map((t: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20">
                        Transductor: {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Números de Serie / Trazabilidad de Activos */}
              <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" size={18} /> Números de Serie Asignados
                  </h3>
                  {!editingSerials ? (
                    <button
                      onClick={() => setEditingSerials(true)}
                      className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={13} /> Editar Seriales
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSaveSerials}
                        disabled={savingSerials}
                        className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={14} /> Guardar
                      </button>
                      <button
                        onClick={() => {
                          setEditingSerials(false);
                          setSerialsValue(booking.serial_numbers || '');
                        }}
                        className="text-xs font-bold text-text-muted hover:underline cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {editingSerials ? (
                  <textarea
                    value={serialsValue}
                    onChange={(e) => setSerialsValue(e.target.value)}
                    placeholder="Ej: Z6: SN-93821092, Transductor Convexo: 3C5P-8921..."
                    rows={3}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-brand"
                  />
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 font-mono text-xs text-text-primary">
                    {booking.serial_numbers || 'No se han registrado números de serie para esta entrega.'}
                  </div>
                )}
                <p className="text-[11px] text-text-muted mt-2">
                  Los números de serie vinculan la remisión técnica y garantizan el inventario exacto entregado al médico.
                </p>
              </div>
            </div>

            {/* Columna lateral: Logística de Entrega */}
            <div className="space-y-6">
              <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                  <Clock className="text-brand" size={18} /> Cronograma de Entrega
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Entrega del Equipo</span>
                    <span className="text-sm font-bold text-text-primary block mt-0.5">{booking.start_date}</span>
                    <span className="text-text-secondary mt-1 block">Hora estimada: {booking.delivery_time || '08:00 AM'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Recogida del Equipo</span>
                    <span className="text-sm font-bold text-text-primary block mt-0.5">{booking.end_date}</span>
                    <span className="text-text-secondary mt-1 block">Hora estimada: {booking.collection_time || '06:00 PM'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Dirección de Destino</span>
                    <span className="text-sm font-bold text-text-primary block mt-0.5">{booking.client_address}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. DATOS DEL CLIENTE */}
        {activeTab === 'client' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <User className="text-brand" size={18} /> Información Profesional
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-text-muted block">Nombre Completo / Razón Social</span>
                  <span className="font-bold text-text-primary text-base">{booking.client_name}</span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block">Tipo de Cliente</span>
                  <span className="font-semibold text-text-primary capitalize flex items-center gap-1.5 mt-0.5">
                    {booking.client_type === 'clinica' || booking.client_type === 'ips' ? <Building2 size={16} className="text-blue-500" /> : <Stethoscope size={16} className="text-emerald-500" />}
                    {booking.client_type || 'Médico independiente'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block">Cédula de Ciudadanía / Documento</span>
                  <span className="font-mono font-bold text-text-primary">{booking.document_number || 'No especificado'}</span>
                </div>
                <div>
                  <span className="text-xs text-text-muted block">NIT de Facturación</span>
                  <span className="font-mono font-bold text-text-primary">{booking.tax_id || 'Mismo documento'}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Phone className="text-brand" size={18} /> Contacto & Ubicación
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-text-muted block">Teléfono / Celular</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono font-bold text-text-primary text-base">{booking.client_phone}</span>
                    {booking.client_phone && (
                      <a
                        href={`https://wa.me/57${booking.client_phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-text-muted block">Correo Electrónico</span>
                  <span className="font-semibold text-text-primary block mt-0.5">
                    {booking.client_email ? (
                      <a href={`mailto:${booking.client_email}`} className="text-brand hover:underline">
                        {booking.client_email}
                      </a>
                    ) : 'No especificado'}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-text-muted block">Dirección de Entrega / Sede</span>
                  <span className="font-semibold text-text-primary block mt-0.5">{booking.client_address}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. FINANZAS & PAGOS */}
        {activeTab === 'financial' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <DollarSign className="text-brand" size={18} /> Desglose de Tarifa
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                  <span className="text-text-secondary">Días facturados:</span>
                  <span className="font-bold text-text-primary font-mono">{daysCount} {daysCount === 1 ? 'día' : 'días'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                  <span className="text-text-secondary">Depósito de Garantía (reembolsable):</span>
                  <span className="font-bold text-text-primary font-mono">$200.000 COP</span>
                </div>
                <div className="flex justify-between items-center py-3 text-lg font-black">
                  <span className="text-text-primary">Monto Total Liquidado:</span>
                  <span className="text-brand font-mono text-2xl">{formatPrice(booking.total_price)}</span>
                </div>
              </div>

              {/* Comprobante de pago */}
              <div className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                <span className="text-xs font-bold text-text-primary block mb-2">Comprobante de Pago</span>
                {booking.payment_receipt_url ? (
                  <div className="flex items-center justify-between">
                    <a
                      href={booking.payment_receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-brand hover:underline flex items-center gap-1.5"
                    >
                      <ExternalLink size={14} /> Ver Comprobante Cargado
                    </a>
                    <label className="text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer">
                      Reemplazar
                      <input type="file" onChange={(e) => handleFileUpload(e, 'receipt')} className="hidden" accept="image/*,.pdf" />
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">No se ha subido ningún comprobante aún.</span>
                    <label className="px-3 py-1.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 cursor-pointer flex items-center gap-1">
                      <Upload size={13} /> {uploadingDoc === 'receipt' ? 'Subiendo...' : 'Subir Comprobante'}
                      <input type="file" onChange={(e) => handleFileUpload(e, 'receipt')} className="hidden" accept="image/*,.pdf" />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" size={18} /> Estado del Pago
              </h3>
              <p className="text-xs text-text-secondary">
                Las reservas marcadas como &quot;Completado&quot; o con comprobante verificado se computan automáticamente en la pantalla de Liquidación.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">Estado Actual</span>
                <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded-lg border ${
                  booking.payment_receipt_url ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                }`}>
                  {booking.payment_receipt_url ? 'PAGO VERIFICADO' : 'PENDIENTE DE PAGO'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. DOCUMENTOS & NOTAS */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Contenedor de 2 Contratos: Generado por Sistema y Firmado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Contrato Generado por el Sistema */}
              <div className="bg-card border border-blue-500/20 dark:border-blue-500/30 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <FileText className="text-blue-500" size={18} /> 1. Contrato Generado por el Sistema
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
                    Datos de la Reserva
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Contrato oficial estructurado con los datos del médico o clínica, equipos asignados, canon de arrendamiento y cláusulas legales vigentes.
                </p>

                <div className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between text-text-secondary">
                      <span>Titular:</span>
                      <strong className="text-text-primary">{booking.client_name || 'Sin especificar'}</strong>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Documento / NIT:</span>
                      <strong className="text-text-primary">{booking.document_number || booking.tax_id || 'N/A'}</strong>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Plazo:</span>
                      <strong className="text-text-primary">{booking.start_date} al {booking.end_date}</strong>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Canon total:</span>
                      <strong className="text-blue-600 dark:text-blue-400 font-bold">${(booking.total_price || 0).toLocaleString()} COP</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowPdfPreview(!showPdfPreview)}
                      className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={14} /> {showPdfPreview ? 'Ocultar Visor' : 'Ver / Descargar Contrato'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Contrato Firmado por el Cliente */}
              <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-500" size={18} /> 2. Contrato Firmado por el Cliente
                  </h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                    booking.signed_contract_url ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {booking.signed_contract_url ? 'Documento Cargado' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Copia firmada física o digitalmente devuelta por el cliente, junto con el acta de entrega o recepción.
                </p>

                <div className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  {booking.signed_contract_url ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check size={14} /> Contrato firmado disponible
                        </span>
                        <a
                          href={booking.signed_contract_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-brand hover:underline flex items-center gap-1.5"
                        >
                          <ExternalLink size={14} /> Abrir documento
                        </a>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-text-muted">¿Deseas reemplazar el archivo?</span>
                        <label className="text-xs font-semibold text-text-secondary hover:text-brand cursor-pointer">
                          Subir nueva versión
                          <input type="file" onChange={(e) => handleFileUpload(e, 'contract')} className="hidden" accept="application/pdf,image/*" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-center py-2">
                      <p className="text-xs text-text-muted">Aún no se ha cargado el contrato firmado por el médico o clínica.</p>
                      <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer">
                        <Upload size={14} /> {uploadingDoc === 'contract' ? 'Subiendo documento...' : 'Subir Contrato Firmado'}
                        <input type="file" onChange={(e) => handleFileUpload(e, 'contract')} className="hidden" accept="application/pdf,image/*" />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Visor Interactivo en Vivo del Contrato Generado */}
            {showPdfPreview && (
              <div className="bg-card border border-blue-500/30 rounded-3xl p-6 shadow-md animate-in fade-in slide-in-from-top-3">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/60 dark:border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-text-primary flex items-center gap-2">
                      <FileText className="text-brand" size={18} /> Documento Oficial Listo para Descargar o Enviar
                    </h4>
                    <p className="text-xs text-text-secondary">Generado automáticamente en tiempo real usando la plantilla legal oficial de alquiler.</p>
                  </div>
                  <button
                    onClick={() => setShowPdfPreview(false)}
                    className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800"
                  >
                    Cerrar Visor
                  </button>
                </div>

                <PDFGenWrapper
                  data={{
                    clientName: (booking.client_name || 'CLIENTE').toUpperCase(),
                    documentNumber: booking.document_number || booking.tax_id || 'N/A',
                    monthlyValue: (booking.total_price || 0).toString(),
                    equipment: (() => {
                      const parts = [];
                      if (booking.quantity_z6 > 0) parts.push(`• ${booking.quantity_z6}x Ecógrafo Mindray Z6`);
                      if (booking.quantity_z60 > 0) parts.push(`• ${booking.quantity_z60}x Ecógrafo Mindray Z60`);
                      if (booking.quantity_m7 > 0) parts.push(`• ${booking.quantity_m7}x Ecógrafo Mindray M7`);
                      if (booking.quantity_mx3 > 0) parts.push(`• ${booking.quantity_mx3}x Ecógrafo Mindray MX3`);
                      if (booking.include_cart) parts.push('• Base rodable (carrito)');
                      if (booking.include_printer) parts.push('• Impresora Sony');
                      if (booking.selected_transducers?.length > 0) parts.push(`• Transductores: ${booking.selected_transducers.join(', ')}`);
                      return parts.join('\n') || 'Ecógrafo Médico Especializado';
                    })(),
                    startDate: booking.start_date || '',
                    fullAddress: booking.client_address || 'Medellín, Antioquia',
                    clientType: booking.client_type || 'Médico independiente',
                    taxId: booking.tax_id || booking.document_number || 'N/A',
                    term: `${(() => {
                      if (!booking.start_date || !booking.end_date) return '1';
                      const start = new Date(booking.start_date);
                      const end = new Date(booking.end_date);
                      const diff = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return diff > 0 ? diff : 1;
                    })()} DÍAS`
                  }}
                />
              </div>
            )}

            {/* Bitácora de Notas y Seguimiento */}
            <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Tag className="text-brand" size={18} /> Bitácora Operativa y Observaciones
              </h3>

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {notesList.length === 0 ? (
                  <p className="text-xs text-text-muted italic">No hay notas registradas para este alquiler.</p>
                ) : (
                  notesList.map((note, index) => (
                    <div key={index} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs">
                      <p className="text-text-primary">{note.text}</p>
                      <span className="text-[10px] text-text-muted mt-1 block">{note.date ? new Date(note.date).toLocaleString('es-CO') : ''}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                <input
                  type="text"
                  placeholder="Escribir novedad u observación técnica..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-text-primary focus:outline-none focus:border-brand"
                />
                <Button onClick={handleAddNote} variant="primary" className="text-xs px-3 py-2 flex items-center gap-1">
                  <Send size={13} /> Agregar
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
