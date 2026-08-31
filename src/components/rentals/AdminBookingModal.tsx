"use client";

import React, { useState, useEffect } from 'react';
import { X, HeartPulse, User, Calendar, MapPin, Clock, Tag, Plus, Minus, DollarSign, Upload, FileText, ClipboardList } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { checkAvailability } from '../../lib/availability';
import { calculateDays, calculateTotalPrice } from '../../lib/pricing';
import Swal from 'sweetalert2';

interface AdminBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bookingToEdit?: any;
  initialDateRange?: { start: string; end: string } | null;
}

export function AdminBookingModal({ isOpen, onClose, onSuccess, bookingToEdit, initialDateRange }: AdminBookingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [availableStock, setAvailableStock] = useState({ z6: 2, z60: 2, m7: 1, mx3: 1 });
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'financial' | 'documents' | 'notes'>('info');

  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    clientAddress: "",
    clientType: "medico",
    documentNumber: "",
    taxId: "",
    startDate: "",
    endDate: "",
    deliveryTime: "",
    collectionTime: "",
    quantityZ6: 0,
    quantityZ60: 0,
    quantityM7: 0,
    quantityMx3: 0,
    includeCart: false,
    includePrinter: false,
    selectedTransducers: [] as string[],
    status: "pending_confirmation",
    notes: "" as string, // JSON or plaintext
    signedContractUrl: "",
    paymentReceiptUrl: "",
    serialNumbers: ""
  });

  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (bookingToEdit && isOpen) {
      setFormData({
        clientName: bookingToEdit.client_name || "",
        clientPhone: bookingToEdit.client_phone || "",
        clientEmail: bookingToEdit.client_email || "",
        clientAddress: bookingToEdit.client_address || "",
        clientType: bookingToEdit.client_type || "medico",
        documentNumber: bookingToEdit.document_number || "",
        taxId: bookingToEdit.tax_id || "",
        startDate: bookingToEdit.start_date || "",
        endDate: bookingToEdit.end_date || "",
        deliveryTime: bookingToEdit.delivery_time || "",
        collectionTime: bookingToEdit.collection_time || "",
        quantityZ6: bookingToEdit.quantity_z6 || 0,
        quantityZ60: bookingToEdit.quantity_z60 || 0,
        quantityM7: bookingToEdit.quantity_m7 || 0,
        quantityMx3: bookingToEdit.quantity_mx3 || 0,
        includeCart: bookingToEdit.include_cart || false,
        includePrinter: bookingToEdit.include_printer || false,
        selectedTransducers: bookingToEdit.selected_transducers || [],
        status: bookingToEdit.status || "pending_confirmation",
        notes: bookingToEdit.notes || "",
        signedContractUrl: bookingToEdit.signed_contract_url || "",
        paymentReceiptUrl: bookingToEdit.payment_receipt_url || "",
        serialNumbers: bookingToEdit.serial_numbers ? (typeof bookingToEdit.serial_numbers === 'object' ? JSON.stringify(bookingToEdit.serial_numbers) : bookingToEdit.serial_numbers) : ""
      });

      // Parse comments
      try {
        if (bookingToEdit.notes && bookingToEdit.notes.startsWith('[')) {
          setComments(JSON.parse(bookingToEdit.notes));
        } else if (bookingToEdit.notes) {
          setComments([{ date: new Date().toLocaleDateString(), text: bookingToEdit.notes, user: 'Admin' }]);
        } else {
          setComments([]);
        }
      } catch (e) {
        setComments([]);
      }
    } else if (!bookingToEdit && isOpen) {
      setFormData({
        clientName: "",
        clientPhone: "",
        clientEmail: "",
        clientAddress: "",
        clientType: "medico",
        documentNumber: "",
        taxId: "",
        startDate: initialDateRange?.start || "",
        endDate: initialDateRange?.end || "",
        deliveryTime: "",
        collectionTime: "",
        quantityZ6: 0,
        quantityZ60: 0,
        quantityM7: 0,
        quantityMx3: 0,
        includeCart: false,
        includePrinter: false,
        selectedTransducers: [],
        status: "pending_confirmation",
        notes: "",
        signedContractUrl: "",
        paymentReceiptUrl: "",
        serialNumbers: ""
      });
      setComments([]);
    }
  }, [bookingToEdit, isOpen, initialDateRange]);

  useEffect(() => {
    const fetchStock = async () => {
      if (!isOpen || !formData.startDate || !formData.endDate) return;
      setIsCheckingStock(true);
      try {
        const stock = await checkAvailability(formData.startDate, formData.endDate, bookingToEdit?.id);
        setAvailableStock(stock);
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setIsCheckingStock(false);
      }
    };
    fetchStock();
  }, [formData.startDate, formData.endDate, isOpen, bookingToEdit?.id]);

  const toggleTransducer = (t: string) => {
    setFormData(p => ({
      ...p,
      selectedTransducers: p.selectedTransducers.includes(t)
        ? p.selectedTransducers.filter(x => x !== t)
        : [...p.selectedTransducers, t]
    }));
  };

  const getDays = () => calculateDays(formData.startDate, formData.endDate);

  const getTotalPrice = () => {
    return calculateTotalPrice({
      quantityZ6: formData.quantityZ6,
      quantityZ60: formData.quantityZ60,
      quantityM7: formData.quantityM7,
      quantityMx3: formData.quantityMx3,
      includeCart: formData.includeCart,
      includePrinter: formData.includePrinter,
      days: getDays(),
      includeShipping: true
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const author = 'Admin'; // In a real app we'd fetch this from state.currentUser
    const commentObj = {
      date: new Date().toLocaleString('es-CO'),
      text: newComment,
      user: author
    };
    const updated = [...comments, commentObj];
    setComments(updated);
    setNewComment("");
    setFormData(prev => ({ ...prev, notes: JSON.stringify(updated) }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'receipt') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('rentals')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) {
        throw error;
      }

      // Generate public URL
      const { data: { publicUrl } } = supabase.storage
        .from('rentals')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        [type === 'contract' ? 'signedContractUrl' : 'paymentReceiptUrl']: publicUrl
      }));

      Swal.fire({
        title: 'Archivo Cargado',
        text: 'El soporte se ha subido correctamente.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('File upload error:', err);
      // Fallback: save local mock URL/name
      const fakeUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        [type === 'contract' ? 'signedContractUrl' : 'paymentReceiptUrl']: fakeUrl
      }));
      Swal.fire({
        title: 'Carga simulada',
        text: 'El archivo se vinculó temporalmente de forma local.',
        icon: 'info',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (formData.status !== 'maintenance' && !formData.clientName) {
      Swal.fire('Error', 'Por favor ingresa el nombre del cliente.', 'error');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      Swal.fire('Error', 'Por favor selecciona las fechas del alquiler.', 'error');
      return;
    }

    setIsLoading(true);

    const payload: any = {
      client_name: formData.status === 'maintenance' ? 'BLOQUEO DE MANTENIMIENTO' : formData.clientName,
      client_phone: formData.clientPhone,
      client_email: formData.clientEmail,
      client_address: formData.clientAddress,
      client_type: formData.clientType,
      document_number: formData.documentNumber,
      tax_id: formData.taxId,
      start_date: formData.startDate,
      end_date: formData.endDate,
      delivery_time: formData.deliveryTime,
      collection_time: formData.collectionTime,
      quantity_z6: formData.quantityZ6,
      quantity_z60: formData.quantityZ60,
      quantity_m7: formData.quantityM7,
      quantity_mx3: formData.quantityMx3,
      include_cart: formData.includeCart,
      include_printer: formData.includePrinter,
      selected_transducers: formData.selectedTransducers,
      status: formData.status,
      notes: formData.notes,
      signed_contract_url: formData.signedContractUrl,
      payment_receipt_url: formData.paymentReceiptUrl,
      serial_numbers: formData.serialNumbers,
      total_price: getTotalPrice()
    };

    try {
      if (bookingToEdit) {
        const { error } = await supabase
          .from('bookings')
          .update(payload)
          .eq('id', bookingToEdit.id);

        if (error) throw error;
        Swal.fire('Guardado', 'El alquiler se ha actualizado correctamente.', 'success');
      } else {
        const { error } = await supabase
          .from('bookings')
          .insert([payload]);

        if (error) throw error;
        Swal.fire('Creado', 'El alquiler se ha registrado correctamente.', 'success');
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error saving booking:', err);
      Swal.fire('Error', 'Ocurrió un error al guardar la reserva en Supabase.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirm = await Swal.fire({
      title: '¿Estás seguro?',
      text: "Esta acción no se puede revertir.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingToEdit.id);

      if (error) throw error;

      Swal.fire('Eliminado', 'La reserva ha sido eliminada.', 'success');
      onSuccess();
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo eliminar la reserva.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openPrintContract = (mode: 'blank' | 'filled') => {
    const clientName = mode === 'blank' ? '_________________________' : formData.clientName || '_________________________';
    const documentNum = mode === 'blank' ? '_____________________' : formData.documentNumber || '_____________________';
    const valueNum = mode === 'blank' ? '___________' : (getTotalPrice()).toLocaleString('es-CO');
    const startStr = mode === 'blank' ? '_________________' : formData.startDate || '_________________';
    const addressStr = mode === 'blank' ? '___________________________' : formData.clientAddress || '___________________________';
    const clientType = mode === 'blank' ? 'MEDICO' : (formData.clientType === 'medico' ? 'MEDICO' : 'REPRESENTANTE');
    const taxNum = mode === 'blank' ? '_____________________' : formData.taxId || '_____________________';
    const daysTerm = mode === 'blank' ? '___________' : `${getDays()} días`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Contrato de Alquiler</title>
          <style>
            body { font-family: 'Helvetica', Arial, sans-serif; padding: 40px; color: #000; line-height: 1.5; font-size: 11px; }
            h2 { text-align: center; margin-bottom: 20px; font-weight: bold; }
            .section { margin-bottom: 15px; text-align: justify; }
            .bold { font-weight: bold; }
            .flex-container { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature-box { width: 45%; border-top: 1px solid #000; padding-top: 5px; }
            .header-table { width: 100%; margin-bottom: 20px; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <h2>CONTRATO DE ARRENDAMIENTO DE EQUIPOS MÉDICOS</h2>
          <div class="section">
            <span class="bold">ARRENDADOR:</span> ECO ESPECIALIZADA SAS (NIT 901004863-4)<br/>
            <span class="bold">ARRENDATARIO:</span> ${clientName.toUpperCase()} (CC/NIT: ${documentNum})
          </div>
          <div class="section">
            <span class="bold">Primera. Objeto:</span> ECO ESPECIALIZADA entrega en alquiler el ecógrafo con sus respectivos accesorios descritos a continuación, en perfecto estado de funcionamiento, para ser ubicado en la dirección: <span class="bold">${addressStr}</span>.
          </div>
          <div class="section">
            <span class="bold">Segunda. Valor:</span> El valor convenido es la suma de <span class="bold">$${valueNum} COP</span>, el cual se cancelará anticipadamente mediante consignación bancaria.
          </div>
          <div class="section">
            <span class="bold">Tercera. Duración:</span> El término del presente alquiler será por un período de <span class="bold">${daysTerm}</span> iniciando el <span class="bold">${startStr}</span>.
          </div>
          <div class="section">
            <span class="bold">Cuarta. Obligaciones:</span> El arrendatario se obliga a cuidar del equipo, evitar golpes, caídas o humedad. El mantenimiento del equipo corresponde únicamente a ECO ESPECIALIZADA SAS.
          </div>
          
          <div class="flex-container">
            <div class="signature-box">
              <span class="bold">EL ARRENDADOR</span><br/>
              ECO ESPECIALIZADA SAS<br/>
              CC. 98.772.407
            </div>
            <div class="signature-box">
              <span class="bold">EL ARRENDATARIO</span><br/>
              ${clientName}<br/>
              ${clientType === 'MEDICO' ? 'RUT' : 'NIT'}: ${taxNum}
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-white/10 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <ClipboardList className="text-brand" size={20} />
            <h3 className="font-black uppercase tracking-tight italic">
              {bookingToEdit ? 'Editar Alquiler' : 'Nueva Reserva de Ecógrafo'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6 shrink-0 bg-white/5">
          <button 
            onClick={() => setActiveTab('info')} 
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'info' ? 'border-brand text-brand' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            Información
          </button>
          <button 
            onClick={() => setActiveTab('financial')} 
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'financial' ? 'border-brand text-brand' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            Desglose de Costos
          </button>
          <button 
            onClick={() => setActiveTab('documents')} 
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'documents' ? 'border-brand text-brand' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            Contratos y Pagos
          </button>
          <button 
            onClick={() => setActiveTab('notes')} 
            className={`py-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${activeTab === 'notes' ? 'border-brand text-brand' : 'border-transparent text-white/50 hover:text-white'}`}
          >
            Bitácora ({comments.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Estado del Alquiler</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand"
                >
                  <option value="pending_confirmation" className="bg-slate-800">En Reposo (Pte. Confirmar)</option>
                  <option value="pending_delivery" className="bg-slate-800">Confirmado - Pendiente de Entrega</option>
                  <option value="delivered" className="bg-slate-800">Entregado en Clínica (Activo)</option>
                  <option value="pending_pickup" className="bg-slate-800">Pendiente de Recogida</option>
                  <option value="completed" className="bg-slate-800">Completado</option>
                  <option value="maintenance" className="bg-slate-800">Mantenimiento / Bloqueo de Stock</option>
                  <option value="cancelled" className="bg-slate-800">Cancelado</option>
                </select>
              </div>

              {formData.status !== 'maintenance' && (
                <>
                  {/* Client Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Nombre del Cliente</label>
                      <input 
                        type="text" 
                        value={formData.clientName}
                        onChange={(e) => setFormData(p => ({ ...p, clientName: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand" 
                        placeholder="Dr. o Clínica"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Teléfono</label>
                      <input 
                        type="text" 
                        value={formData.clientPhone}
                        onChange={(e) => setFormData(p => ({ ...p, clientPhone: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand" 
                        placeholder="Celular"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Cédula / NIT</label>
                      <input 
                        type="text" 
                        value={formData.documentNumber}
                        onChange={(e) => setFormData(p => ({ ...p, documentNumber: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand" 
                        placeholder="CC o NIT"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">RUT / Identificación Fiscal</label>
                      <input 
                        type="text" 
                        value={formData.taxId}
                        onChange={(e) => setFormData(p => ({ ...p, taxId: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand" 
                        placeholder="RUT del arrendatario"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Dirección de Entrega</label>
                    <input 
                      type="text" 
                      value={formData.clientAddress}
                      onChange={(e) => setFormData(p => ({ ...p, clientAddress: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand" 
                      placeholder="Dirección completa y ciudad"
                    />
                  </div>
                </>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    value={formData.startDate}
                    onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Fecha de Fin</label>
                  <input 
                    type="date" 
                    value={formData.endDate}
                    onChange={(e) => setFormData(p => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand" 
                  />
                </div>
              </div>

              {/* Ecógrafos a Alquilar */}
              <div className="border border-white/10 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Cantidades de Equipos</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                    <span className="text-xs font-bold text-white">MINDRAY Z6</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFormData(p => ({ ...p, quantityZ6: Math.max(0, p.quantityZ6 - 1) }))} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"><Minus size={12} /></button>
                      <span className="font-mono font-bold text-white text-xs">{formData.quantityZ6}</span>
                      <button onClick={() => setFormData(p => ({ ...p, quantityZ6: Math.min(availableStock.z6, p.quantityZ6 + 1) }))} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"><Plus size={12} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                    <span className="text-xs font-bold text-white">MINDRAY Z60</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFormData(p => ({ ...p, quantityZ60: Math.max(0, p.quantityZ60 - 1) }))} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"><Minus size={12} /></button>
                      <span className="font-mono font-bold text-white text-xs">{formData.quantityZ60}</span>
                      <button onClick={() => setFormData(p => ({ ...p, quantityZ60: Math.min(availableStock.z60, p.quantityZ60 + 1) }))} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"><Plus size={12} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                    <span className="text-xs font-bold text-white">MINDRAY M7</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFormData(p => ({ ...p, quantityM7: Math.max(0, p.quantityM7 - 1) }))} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"><Minus size={12} /></button>
                      <span className="font-mono font-bold text-white text-xs">{formData.quantityM7}</span>
                      <button onClick={() => setFormData(p => ({ ...p, quantityM7: Math.min(availableStock.m7, p.quantityM7 + 1) }))} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"><Plus size={12} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-lg border border-white/5">
                    <span className="text-xs font-bold text-white">MINDRAY MX3</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFormData(p => ({ ...p, quantityMx3: Math.max(0, p.quantityMx3 - 1) }))} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"><Minus size={12} /></button>
                      <span className="font-mono font-bold text-white text-xs">{formData.quantityMx3}</span>
                      <button onClick={() => setFormData(p => ({ ...p, quantityMx3: Math.min(availableStock.mx3, p.quantityMx3 + 1) }))} className="p-1 rounded bg-white/10 hover:bg-white/20 text-white"><Plus size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transductores */}
              <div className="border border-white/10 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Transductores Extra Requeridos</span>
                <div className="flex flex-wrap gap-2">
                  {['Convexo', 'Endocavitario', 'Lineal'].map(trans => (
                    <button
                      key={trans}
                      type="button"
                      onClick={() => toggleTransducer(trans)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${formData.selectedTransducers.includes(trans) ? 'bg-brand/10 border-brand text-brand' : 'bg-white/5 border-white/10 text-white/50'}`}
                    >
                      {trans}
                    </button>
                  ))}
                </div>
              </div>

              {/* Serial numbers */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-white/40 block mb-1.5">Números de Serie Despachados</label>
                <input 
                  type="text" 
                  value={formData.serialNumbers}
                  onChange={(e) => setFormData(p => ({ ...p, serialNumbers: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand" 
                  placeholder="Ej: Ecógrafo S/N: Z60-123, Convexo S/N: C-991"
                />
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Desglose de Costos de Reserva</span>
              
              <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5">
                {formData.quantityZ6 > 0 && (
                  <div className="p-4 flex justify-between bg-white/5">
                    <span className="text-white font-semibold">Alquiler Ecógrafo Z6 (x{formData.quantityZ6})</span>
                    <span className="font-mono text-white">${(formData.quantityZ6 * 350000 * getDays()).toLocaleString('es-CO')}</span>
                  </div>
                )}
                {formData.quantityZ60 > 0 && (
                  <div className="p-4 flex justify-between bg-white/5">
                    <span className="text-white font-semibold">Alquiler Ecógrafo Z60 (x{formData.quantityZ60})</span>
                    <span className="font-mono text-white">${(formData.quantityZ60 * 550000 * getDays()).toLocaleString('es-CO')}</span>
                  </div>
                )}
                {formData.quantityM7 > 0 && (
                  <div className="p-4 flex justify-between bg-white/5">
                    <span className="text-white font-semibold">Alquiler Ecógrafo M7 (x{formData.quantityM7})</span>
                    <span className="font-mono text-white">${(formData.quantityM7 * 650000 * getDays()).toLocaleString('es-CO')}</span>
                  </div>
                )}
                {formData.quantityMx3 > 0 && (
                  <div className="p-4 flex justify-between bg-white/5">
                    <span className="text-white font-semibold">Alquiler Ecógrafo MX3 (x{formData.quantityMx3})</span>
                    <span className="font-mono text-white">${(formData.quantityMx3 * 600000 * getDays()).toLocaleString('es-CO')}</span>
                  </div>
                )}
                
                {/* Accessories */}
                <div className="p-4 flex justify-between bg-white/5 items-center">
                  <span className="text-white font-semibold">Incluir Carrito (Opcional, $50.000)</span>
                  <input 
                    type="checkbox" 
                    checked={formData.includeCart}
                    onChange={(e) => setFormData(p => ({ ...p, includeCart: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand border-white/10"
                  />
                </div>
                <div className="p-4 flex justify-between bg-white/5 items-center">
                  <span className="text-white font-semibold">Incluir Impresora de Video (Opcional, $120.000)</span>
                  <input 
                    type="checkbox" 
                    checked={formData.includePrinter}
                    onChange={(e) => setFormData(p => ({ ...p, includePrinter: e.target.checked }))}
                    className="w-4 h-4 rounded text-brand border-white/10"
                  />
                </div>

                <div className="p-4 flex justify-between bg-white/5">
                  <span className="text-white font-semibold">Envío / Logística (Requerido)</span>
                  <span className="font-mono text-white">$50.000</span>
                </div>

                {/* Grand Total */}
                <div className="p-4 flex justify-between bg-brand/10 border-t border-brand/20">
                  <span className="text-brand font-black uppercase text-xs tracking-wider">Total a Pagar ({getDays()} días)</span>
                  <span className="font-mono text-brand font-black">${(getTotalPrice()).toLocaleString('es-CO')} COP</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Gestión de Contratos</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button 
                  onClick={() => openPrintContract('blank')}
                  className="p-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 text-white transition-colors"
                >
                  <FileText className="text-white/40" size={24} />
                  <span className="text-xs font-bold text-center">Imprimir Contrato Vacío</span>
                </button>

                <button 
                  onClick={() => openPrintContract('filled')}
                  className="p-4 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 flex flex-col items-center justify-center gap-2 hover:bg-white/10 text-white transition-colors"
                >
                  <ClipboardList className="text-brand" size={24} />
                  <span className="text-xs font-bold text-center">Contrato Rápido PDF</span>
                </button>

                <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2 text-white relative">
                  <Upload className="text-blue-400" size={24} />
                  <span className="text-xs font-bold text-center">Subir Contrato Firmado</span>
                  <input 
                    type="file" 
                    onChange={(e) => handleFileUpload(e, 'contract')} 
                    accept=".pdf,.png,.jpg,.jpeg" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {formData.signedContractUrl && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-bold">Contrato digital firmado cargado</span>
                  <a href={formData.signedContractUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-white hover:underline uppercase">Ver Contrato</a>
                </div>
              )}

              <hr className="border-white/10 my-4" />

              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Comprobantes de Pago</span>

              <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-2 text-white relative">
                <Upload className="text-emerald-400" size={24} />
                <span className="text-xs font-bold text-center">Subir Comprobante de Abono / Pago</span>
                <input 
                  type="file" 
                  onChange={(e) => handleFileUpload(e, 'receipt')} 
                  accept=".pdf,.png,.jpg,.jpeg" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>

              {formData.paymentReceiptUrl && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-bold">Comprobante de pago cargado</span>
                  <a href={formData.paymentReceiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-white hover:underline uppercase">Ver Soporte</a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/40 block">Bitácora de Observaciones</span>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {comments.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-6">No hay anotaciones registradas en este alquiler.</p>
                ) : (
                  comments.map((c, i) => (
                    <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-brand uppercase tracking-wider">{c.user}</span>
                        <span className="text-[10px] text-white/40">{c.date}</span>
                      </div>
                      <p className="text-xs text-white/80">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe una observación operativa..."
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-brand"
                />
                <button 
                  onClick={handleAddComment}
                  className="px-4 py-2 bg-brand text-white font-bold rounded-xl text-xs hover:bg-brand/80 active:scale-95 transition-all"
                >
                  Agregar
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 shrink-0 bg-white/5 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 rounded-b-2xl">
          <div>
            {bookingToEdit && (
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold rounded-xl text-xs transition-colors w-full sm:w-auto"
              >
                Eliminar Reserva
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button 
              onClick={onClose} 
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold rounded-xl text-xs transition-colors w-full sm:w-auto"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              disabled={isLoading}
              className="px-4 py-2 bg-brand text-white font-black rounded-xl text-xs hover:bg-brand/90 active:scale-95 transition-all w-full sm:w-auto flex items-center justify-center"
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
