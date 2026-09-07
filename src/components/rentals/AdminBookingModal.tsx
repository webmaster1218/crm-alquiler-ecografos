"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  HeartPulse, 
  User, 
  Calendar, 
  MapPin, 
  Clock, 
  Tag, 
  Plus, 
  Minus,
  Printer,
  ShoppingBag,
  Check,
  ShieldAlert,
  Stethoscope,
  CalendarDays,
  Trash2
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabaseClient";
import { checkAvailability } from "../../lib/availability";
import { calculateDays, calculateTotalPrice } from "../../lib/pricing";


interface AdminBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    bookingToEdit?: any;
    initialDateRange?: { start: string; end: string } | null;
    isBlockingMode?: boolean;
}

export function AdminBookingModal({ isOpen, onClose, onSuccess, bookingToEdit, initialDateRange, isBlockingMode }: AdminBookingModalProps) {

    const [isLoading, setIsLoading] = useState(false);
    const [availableStock, setAvailableStock] = useState({ z6: 2, z60: 2, m7: 1, mx3: 1 });
    const [isCheckingStock, setIsCheckingStock] = useState(false);
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
        status: "pending_delivery",
        notes: "",
        // Independent dates for massive blocking
        z6StartDate: "",
        z6EndDate: "",
        z60StartDate: "",
        z60EndDate: "",
        m7StartDate: "",
        m7EndDate: "",
        mx3StartDate: "",
        mx3EndDate: ""
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
                status: bookingToEdit.status || "pending_delivery",
                notes: bookingToEdit.notes || "",
                z6StartDate: bookingToEdit.start_date || "",
                z6EndDate: bookingToEdit.end_date || "",
                z60StartDate: bookingToEdit.start_date || "",
                z60EndDate: bookingToEdit.end_date || "",
                m7StartDate: bookingToEdit.start_date || "",
                m7EndDate: bookingToEdit.end_date || "",
                mx3StartDate: bookingToEdit.start_date || "",
                mx3EndDate: bookingToEdit.end_date || ""
            });
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
                status: isBlockingMode ? "maintenance" : "pending_delivery",
                notes: "",
                z6StartDate: initialDateRange?.start || "",
                z6EndDate: initialDateRange?.end || "",
                z60StartDate: initialDateRange?.start || "",
                z60EndDate: initialDateRange?.end || "",
                m7StartDate: initialDateRange?.start || "",
                m7EndDate: initialDateRange?.end || "",
                mx3StartDate: initialDateRange?.start || "",
                mx3EndDate: initialDateRange?.end || ""
            });
        }
    }, [bookingToEdit, isOpen, initialDateRange, isBlockingMode]);

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
            includeShipping: false // In admin, we might not want to force shipping by default yet, or maybe yes?
            // Actually, let's make it consistent with the user's needs. 
            // Most admin bookings are direct, might not need shipping. 
            // I'll leave it as false for now but I can add a toggle if they want.
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSupabaseConfigured || !supabase) return;

        setIsLoading(true);
        try {
            if (bookingToEdit) {
                const payload = {
                    client_name: formData.clientName,
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
                    total_price: getTotalPrice()
                };
                const { error } = await supabase.from('bookings').update(payload).eq('id', bookingToEdit.id);
                if (error) throw error;
            } else if (isBlockingMode) {
                // MASSIVE BLOCKING: Create one record per model if quantity > 0
                const blocks = [];
                if (formData.quantityZ6 > 0) {
                    blocks.push({
                        client_name: "BLOQUEO Z6",
                        status: 'maintenance',
                        quantity_z6: formData.quantityZ6,
                        quantity_z60: 0,
                        quantity_m7: 0,
                        quantity_mx3: 0,
                        start_date: formData.z6StartDate || formData.startDate,
                        end_date: formData.z6EndDate || formData.endDate,
                        notes: `Bloqueo masivo: ${formData.notes}`.trim()
                    });
                }
                if (formData.quantityZ60 > 0) {
                    blocks.push({
                        client_name: "BLOQUEO Z60",
                        status: 'maintenance',
                        quantity_z6: 0,
                        quantity_z60: formData.quantityZ60,
                        quantity_m7: 0,
                        quantity_mx3: 0,
                        start_date: formData.z60StartDate || formData.startDate,
                        end_date: formData.z60EndDate || formData.endDate,
                        notes: `Bloqueo masivo: ${formData.notes}`.trim()
                    });
                }
                if (formData.quantityM7 > 0) {
                    blocks.push({
                        client_name: "BLOQUEO M7",
                        status: 'maintenance',
                        quantity_z6: 0,
                        quantity_z60: 0,
                        quantity_m7: formData.quantityM7,
                        quantity_mx3: 0,
                        start_date: formData.m7StartDate || formData.startDate,
                        end_date: formData.m7EndDate || formData.endDate,
                        notes: `Bloqueo masivo: ${formData.notes}`.trim()
                    });
                }
                if (formData.quantityMx3 > 0) {
                    blocks.push({
                        client_name: "BLOQUEO MX3",
                        status: 'maintenance',
                        quantity_z6: 0,
                        quantity_z60: 0,
                        quantity_m7: 0,
                        quantity_mx3: formData.quantityMx3,
                        start_date: formData.mx3StartDate || formData.startDate,
                        end_date: formData.mx3EndDate || formData.endDate,
                        notes: `Bloqueo masivo: ${formData.notes}`.trim()
                    });
                }

                if (blocks.length === 0) {
                    alert("Por favor selecciona al menos un equipo para bloquear");
                    setIsLoading(false);
                    return;
                }

                const { error } = await supabase.from('bookings').insert(blocks);
                if (error) throw error;
            } else {
                const payload = {
                    client_name: formData.clientName,
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
                    total_price: getTotalPrice()
                };
                const { error } = await supabase.from('bookings').insert([payload]);
                if (error) throw error;
            }
            onSuccess();
        } catch (err: any) {
            console.error('Error saving booking:', err);
            const msg = err?.message || err?.code || JSON.stringify(err);
            alert(`Error al guardar: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!isSupabaseConfigured || !supabase || !bookingToEdit) return;
        setIsLoading(true);
        try {
            const { error } = await supabase.from('bookings').delete().eq('id', bookingToEdit.id);
            if (error) throw error;
            onSuccess();
        } catch (err) {
            console.error('Error deleting booking:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getHeaderColor = () => {
        if (isBlockingMode) return 'bg-slate-900';
        switch (formData.status) {
            case 'delivered': return 'bg-emerald-600';
            case 'pending_pickup': return 'bg-red-500';
            case 'completed': return 'bg-slate-700';
            case 'maintenance': return 'bg-slate-800';
            case 'cancelled': return 'bg-red-900';
            default: return 'bg-blue-600';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 md:p-6 overflow-y-auto">
            <div className={`bg-white dark:bg-slate-900 rounded-3xl w-full ${isBlockingMode ? 'max-w-3xl' : 'max-w-5xl'} shadow-2xl relative overflow-hidden my-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150`}>

                {/* Header */}
                <div className="px-6 md:px-8 py-4 bg-slate-950 border-b border-slate-800/90 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                            {isBlockingMode ? <ShieldAlert size={20} className="text-amber-400" /> : <Stethoscope size={20} className="text-blue-400" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-lg text-white tracking-tight leading-none">
                                    {isBlockingMode ? 'Bloqueo Técnico de Flota' : (bookingToEdit ? 'Gestionar Logística de Reserva' : 'Nueva Reserva Manual')}
                                </h3>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    Admin
                                </span>
                            </div>
                            <p className="text-slate-400 text-xs font-medium mt-1">
                                {isBlockingMode ? 'Bloqueo por mantenimiento o calibración técnica sin datos de cliente' : 'Control operativo de reserva, fechas de entrega y flota contratada'}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 md:p-8 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto">
                        {isBlockingMode ? (
                            /* ── BLOCKING MODE ── */
                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-3">
                                    <ShieldAlert size={20} className="shrink-0 text-amber-500" />
                                    <span>Esta herramienta bloquea los equipos en el calendario para mantenimiento o reservas internas sin asociar un cliente.</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-200 dark:border-slate-800">
                                        <HeartPulse size={15} className="text-brand" />
                                        <span>Equipos a Bloquear</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { key: 'quantityZ6' as const, startKey: 'z6StartDate' as const, endKey: 'z6EndDate' as const, label: 'Mindray Z6', max: availableStock.z6 },
                                            { key: 'quantityZ60' as const, startKey: 'z60StartDate' as const, endKey: 'z60EndDate' as const, label: 'Mindray Z60', max: availableStock.z60 },
                                            { key: 'quantityM7' as const, startKey: 'm7StartDate' as const, endKey: 'm7EndDate' as const, label: 'Mindray M7', max: availableStock.m7 },
                                            { key: 'quantityMx3' as const, startKey: 'mx3StartDate' as const, endKey: 'mx3EndDate' as const, label: 'Mindray MX3', max: availableStock.mx3 },
                                        ].map(({ key, startKey, endKey, label, max }) => {
                                            const qty = formData[key];
                                            return (
                                                <div 
                                                    key={key} 
                                                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                                                        qty > 0 
                                                            ? 'border-brand/40 bg-brand/5 dark:bg-brand/10' 
                                                            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{label}</span>
                                                        <div className="flex items-center gap-2.5">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setFormData(p => ({ ...p, [key]: Math.max(0, p[key] - 1) }))}
                                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand cursor-pointer shadow-2xs"
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <span className="w-6 text-center font-mono font-black text-base text-slate-900 dark:text-slate-100">{qty}</span>
                                                            <button 
                                                                type="button" 
                                                                disabled={qty >= max}
                                                                onClick={() => setFormData(p => ({ ...p, [key]: Math.min(max, p[key] + 1) }))}
                                                                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand disabled:opacity-30 cursor-pointer shadow-2xs"
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {qty > 0 && (
                                                        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                                            <div>
                                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Desde</label>
                                                                <input 
                                                                    type="date"
                                                                    value={formData[startKey]}
                                                                    onChange={e => setFormData({ ...formData, [startKey]: e.target.value })}
                                                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-brand"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hasta</label>
                                                                <input 
                                                                    type="date"
                                                                    value={formData[endKey]}
                                                                    min={formData[startKey]}
                                                                    onChange={e => setFormData({ ...formData, [endKey]: e.target.value })}
                                                                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold outline-none focus:border-brand"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* ── NORMAL MODE: Modern 3-column layout ── */
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                                {/* Column 1: Client Information */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                                        <User size={15} className="text-brand" />
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Datos del Cliente</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                                Nombre Completo <span className="lowercase font-normal text-slate-400">(Opcional)</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="Dr. Juan Pérez / Clínica Medellín..." 
                                                className="w-full px-3.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all placeholder:text-slate-400"
                                                value={formData.clientName} 
                                                onChange={e => setFormData({ ...formData, clientName: e.target.value })} 
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                                    Cédula (CC)
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="1037..." 
                                                    className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-brand outline-none transition-all placeholder:text-slate-400"
                                                    value={formData.documentNumber} 
                                                    onChange={e => setFormData({ ...formData, documentNumber: e.target.value })} 
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                                    NIT / RUT
                                                </label>
                                                <input 
                                                    type="text" 
                                                    placeholder="9019..." 
                                                    className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-brand outline-none transition-all placeholder:text-slate-400"
                                                    value={formData.taxId} 
                                                    onChange={e => setFormData({ ...formData, taxId: e.target.value })} 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                                Teléfono WhatsApp <span className="lowercase font-normal text-slate-400">(Opcional)</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                placeholder="300 123 4567" 
                                                className="w-full px-3.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-brand outline-none transition-all placeholder:text-slate-400"
                                                value={formData.clientPhone} 
                                                onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} 
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                                Email <span className="lowercase font-normal text-slate-400">(Opcional)</span>
                                            </label>
                                            <input 
                                                type="email" 
                                                placeholder="medico@ejemplo.com" 
                                                className="w-full px-3.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-brand outline-none transition-all placeholder:text-slate-400"
                                                value={formData.clientEmail} 
                                                onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} 
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                                Tipo de Cliente
                                            </label>
                                            <select 
                                                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:border-brand outline-none transition-all cursor-pointer"
                                                value={formData.clientType} 
                                                onChange={e => setFormData({ ...formData, clientType: e.target.value })}
                                            >
                                                <option value="medico">Médico Independiente</option>
                                                <option value="clinica">Clínica / IPS</option>
                                                <option value="movil">Servicio Móvil</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Column 2: Logistics & Schedule */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                                        <Clock size={15} className="text-brand" />
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Logística y Horarios</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Fecha Entrega</label>
                                                <input 
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand cursor-pointer"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Horario Entrega</label>
                                                <select 
                                                    className="w-full px-2 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-medium text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-brand cursor-pointer"
                                                    value={formData.deliveryTime} 
                                                    onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}
                                                >
                                                    <option value="">Selección...</option>
                                                    <option value="7:00 AM - 8:00 AM">7:00 AM - 8:00 AM</option>
                                                    <option value="8:00 AM - 9:00 AM">8:00 AM - 9:00 AM</option>
                                                    <option value="9:00 AM - 10:00 AM">9:00 AM - 10:00 AM</option>
                                                    <option value="Tarde (2:00 PM - 5:00 PM)">Tarde (2-5PM)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Fecha Recogida</label>
                                                <input 
                                                    type="date"
                                                    value={formData.endDate}
                                                    min={formData.startDate}
                                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-semibold text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-brand cursor-pointer"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Horario Recogida</label>
                                                <select 
                                                    className="w-full px-2 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-medium text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-brand cursor-pointer"
                                                    value={formData.collectionTime} 
                                                    onChange={e => setFormData({ ...formData, collectionTime: e.target.value })}
                                                >
                                                    <option value="">Selección...</option>
                                                    <option value="5:00 PM - 6:00 PM">5:00 PM - 6:00 PM</option>
                                                    <option value="6:00 PM - 7:00 PM">6:00 PM - 7:00 PM</option>
                                                    <option value="Mañana (8:00 AM - 12:00 PM)">Mañana (8-12PM)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                                Dirección de Entrega <span className="lowercase font-normal text-slate-400">(Opcional)</span>
                                            </label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3.5 top-2.5 text-slate-400" size={15} />
                                                <textarea 
                                                    rows={2} 
                                                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-semibold outline-none resize-none text-xs text-slate-900 dark:text-slate-100 focus:border-brand placeholder:text-slate-400"
                                                    placeholder="Calle 123 #45-67, Consultorio 501, Medellín..."
                                                    value={formData.clientAddress} 
                                                    onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                                                Estado del Servicio
                                            </label>
                                            <select 
                                                className="w-full px-3 py-2 rounded-xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-brand cursor-pointer"
                                                value={formData.status} 
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="pending_confirmation">🟡 Por Confirmar (Sin Pago)</option>
                                                <option value="confirmed">🔵 Confirmado</option>
                                                <option value="pending_delivery">🟣 Pendiente de Entregar</option>
                                                <option value="delivered">🟢 Entregado / Activo en Cliente</option>
                                                <option value="pending_pickup">🔴 Pendiente por Recoger</option>
                                                <option value="completed">⚪ Finalizado</option>
                                                <option value="maintenance">🛠️ Bloqueo / Mantenimiento</option>
                                                <option value="cancelled">❌ Cancelado</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Column 3: Equipment & Extras */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                                        <Tag size={15} className="text-brand" />
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Equipos y Accesorios</span>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {[
                                                { key: 'quantityZ6' as const, label: 'Mindray Z6', max: availableStock.z6 },
                                                { key: 'quantityZ60' as const, label: 'Mindray Z60', max: availableStock.z60 },
                                                { key: 'quantityM7' as const, label: 'Mindray M7', max: availableStock.m7 },
                                                { key: 'quantityMx3' as const, label: 'Mindray MX3', max: availableStock.mx3 },
                                            ].map(({ key, label, max }) => {
                                                const qty = formData[key];
                                                const available = max - qty;
                                                return (
                                                    <div 
                                                        key={key} 
                                                        className={`p-2.5 rounded-2xl border transition-all ${
                                                            qty > 0 
                                                                ? 'border-brand/40 bg-brand/5 dark:bg-brand/10' 
                                                                : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-1 mb-1.5">
                                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">{label}</span>
                                                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full border ${
                                                                available > 0 
                                                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                                                            }`}>
                                                                Disp: {available}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setFormData(p => ({ ...p, [key]: Math.max(0, p[key] - 1) }))}
                                                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand cursor-pointer shadow-2xs"
                                                            >
                                                                <Minus size={11} />
                                                            </button>
                                                            <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">{qty}</span>
                                                            <button 
                                                                type="button" 
                                                                disabled={qty >= max}
                                                                onClick={() => setFormData(p => ({ ...p, [key]: Math.min(max, p[key] + 1) }))}
                                                                className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand disabled:opacity-30 cursor-pointer shadow-2xs"
                                                            >
                                                                <Plus size={11} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Transductores</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {['Convexo', 'Lineal', 'Transvaginal', 'Sectorial'].map(t => {
                                                    const isSelected = formData.selectedTransducers.includes(t);
                                                    return (
                                                        <button 
                                                            key={t} 
                                                            type="button" 
                                                            onClick={() => toggleTransducer(t)}
                                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                                                isSelected 
                                                                    ? 'bg-brand text-white border-brand shadow-2xs' 
                                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand/30'
                                                            }`}
                                                        >
                                                            {t}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div 
                                                onClick={() => setFormData(p => ({ ...p, includeCart: !p.includeCart }))}
                                                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                                    formData.includeCart 
                                                        ? 'bg-brand/5 border-brand/40 dark:bg-brand/10' 
                                                        : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 hover:border-brand/30'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                        formData.includeCart ? 'bg-brand text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                                    }`}>
                                                        <ShoppingBag size={13} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">Carrito</div>
                                                        <div className="text-[9px] text-slate-400">Base Rodable</div>
                                                    </div>
                                                </div>
                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                                    formData.includeCart ? 'bg-brand border-brand text-white' : 'border-slate-300 dark:border-slate-700'
                                                }`}>
                                                    {formData.includeCart && <Check size={10} strokeWidth={3} />}
                                                </div>
                                            </div>

                                            <div 
                                                onClick={() => setFormData(p => ({ ...p, includePrinter: !p.includePrinter }))}
                                                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                                    formData.includePrinter 
                                                        ? 'bg-brand/5 border-brand/40 dark:bg-brand/10' 
                                                        : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 hover:border-brand/30'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                                        formData.includePrinter ? 'bg-brand text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                                    }`}>
                                                        <Printer size={13} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">Impresora</div>
                                                        <div className="text-[9px] text-slate-400">Sony Térmica</div>
                                                    </div>
                                                </div>
                                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                                    formData.includePrinter ? 'bg-brand border-brand text-white' : 'border-slate-300 dark:border-slate-700'
                                                }`}>
                                                    {formData.includePrinter && <Check size={10} strokeWidth={3} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 md:px-8 py-3.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            {bookingToEdit && (
                                <button 
                                    disabled={isLoading} 
                                    type="button" 
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                    {isBlockingMode ? 'Eliminar Bloqueo' : 'Eliminar Reserva'}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                            {!isBlockingMode && (
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Estimado</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono leading-none mt-0.5">
                                        ${getTotalPrice().toLocaleString('es-CO')} <span className="text-[10px] font-bold text-slate-400 font-sans">COP</span>
                                    </p>
                                </div>
                            )}

                            <button 
                                type="button" 
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>

                            <button 
                                disabled={isLoading} 
                                type="submit"
                                className="px-6 py-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-black shadow-md shadow-brand/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                                        Procesando...
                                    </>
                                ) : (
                                    isBlockingMode
                                        ? (bookingToEdit ? 'Actualizar Bloqueo' : 'Confirmar Bloqueo')
                                        : (bookingToEdit ? 'Guardar Cambios' : 'Crear Reserva')
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Delete Confirm Overlay */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-10 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl">
                            <div className="w-12 h-12 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 mb-1">
                                {isBlockingMode ? '¿Eliminar Bloqueo?' : '¿Eliminar Reserva?'}
                            </h3>
                            <p className="text-slate-500 text-xs mb-6">Esta acción es irreversible y eliminará el registro de la base de datos.</p>
                            <div className="flex gap-2.5 justify-center">
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    disabled={isLoading} 
                                    onClick={handleDelete}
                                    className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isLoading ? 'Eliminando...' : 'Sí, eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

