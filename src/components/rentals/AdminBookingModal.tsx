"use client";

import { useState, useEffect } from "react";
import { X, HeartPulse, User, Calendar, MapPin, Clock, Tag, Plus, Minus } from "lucide-react";
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 md:p-4 overflow-y-auto">
            <div className={`bg-white rounded-3xl md:rounded-[40px] w-full ${isBlockingMode ? 'max-w-3xl' : 'max-w-5xl'} shadow-2xl relative overflow-hidden my-auto border border-slate-200`}>

                {/* Header */}
                <div className={`p-6 md:p-8 flex justify-between items-center text-white ${getHeaderColor()} shadow-lg`}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <HeartPulse size={32} />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl tracking-tight leading-none mb-1">
                                {isBlockingMode ? 'Bloqueo Administrativo' : (bookingToEdit ? 'Gestionar Logística' : 'Nueva Reserva Manual')}
                            </h3>
                            <p className="text-white/80 text-xs font-bold uppercase tracking-[0.2em]">Alquiler de Ecógrafos Admin</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all hover:rotate-90">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-10">
                    {isBlockingMode ? (
                        /* ── BLOCKING MODE: Clean 2-column layout ── */
                        <div className="space-y-8">
                            <p className="text-slate-500 text-sm font-medium bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                                <span className="text-2xl">🔒</span> Esta herramienta bloquea los equipos en el calendario para mantenimiento o reservas internas sin registrar datos de cliente.
                            </p>

                            <div className="grid grid-cols-1 gap-8">
                                {/* Equipment - Full Width Massive Blocking */}
                                <div className="space-y-6">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
                                        <HeartPulse size={16} /> Configuración de Bloqueo por Equipo
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { key: 'quantityZ6' as const, startKey: 'z6StartDate' as const, endKey: 'z6EndDate' as const, label: 'Mindray Z6', color: 'blue', max: availableStock.z6 },
                                            { key: 'quantityZ60' as const, startKey: 'z60StartDate' as const, endKey: 'z60EndDate' as const, label: 'Mindray Z60', color: 'blue', max: availableStock.z60 },
                                            { key: 'quantityM7' as const, startKey: 'm7StartDate' as const, endKey: 'm7EndDate' as const, label: 'Mindray M7', color: 'indigo', max: availableStock.m7 },
                                            { key: 'quantityMx3' as const, startKey: 'mx3StartDate' as const, endKey: 'mx3EndDate' as const, label: 'Mindray MX3', color: 'indigo', max: availableStock.mx3 },
                                        ].map(({ key, startKey, endKey, label, color, max }) => (
                                            <div key={key} className={`bg-slate-50 p-6 rounded-3xl border ${formData[key] > 0 ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100'} space-y-4 transition-all`}>
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-black text-${color}-600 uppercase tracking-wider`}>{label}</span>
                                                    <div className="flex items-center gap-3">
                                                        <button type="button" onClick={() => setFormData(p => ({ ...p, [key]: Math.max(0, p[key] - 1) }))}
                                                            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm">
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className="w-8 text-center font-black text-xl text-slate-800">{formData[key]}</span>
                                                        <button type="button" disabled={formData[key] >= max}
                                                            onClick={() => setFormData(p => ({ ...p, [key]: Math.min(max, p[key] + 1) }))}
                                                            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-sm disabled:opacity-30">
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {formData[key] > 0 && (
                                                    <div className="grid grid-cols-2 gap-3 pt-2 animate-in fade-in slide-in-from-top-2">
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Desde</label>
                                                            <input 
                                                                type="date"
                                                                value={formData[startKey]}
                                                                onChange={e => setFormData({ ...formData, [startKey]: e.target.value })}
                                                                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white text-xs font-semibold outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Hasta</label>
                                                            <input 
                                                                type="date"
                                                                value={formData[endKey]}
                                                                min={formData[startKey]}
                                                                onChange={e => setFormData({ ...formData, [endKey]: e.target.value })}
                                                                className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white text-xs font-semibold outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ── NORMAL MODE: 3-column layout ── */
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">

                            {/* Column 1: Client Information */}
                            <div className="space-y-8">
                                <div>
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">
                                        <User size={16} /> Datos del Cliente
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Nombre Completo <span className="text-slate-300 font-normal lowercase">(Opcional)</span></label>
                                            <input type="text" className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-sm"
                                                value={formData.clientName} onChange={e => setFormData({ ...formData, clientName: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 items-start">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Documento (CC) <span className="text-slate-300 font-normal lowercase">(Opc)</span></label>
                                                <input type="text" className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-sm"
                                                    value={formData.documentNumber} onChange={e => setFormData({ ...formData, documentNumber: e.target.value })} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">NIT / RUT <span className="text-[8px] opacity-40 lowercase font-normal">Opcional</span></label>
                                                <input type="text" className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-sm"
                                                    value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Teléfono WhatsApp <span className="text-slate-300 font-normal lowercase">(Opcional)</span></label>
                                            <input type="text" className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-sm"
                                                value={formData.clientPhone} onChange={e => setFormData({ ...formData, clientPhone: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Email <span className="text-slate-300 font-normal lowercase">(Opcional)</span></label>
                                            <input type="email" className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-sm"
                                                value={formData.clientEmail} onChange={e => setFormData({ ...formData, clientEmail: e.target.value })} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Tipo de Cliente</label>
                                            <select className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white outline-none font-semibold text-sm cursor-pointer"
                                                value={formData.clientType} onChange={e => setFormData({ ...formData, clientType: e.target.value })}>
                                                <option value="medico">Médico Independiente</option>
                                                <option value="clinica">Clínica / IPS</option>
                                                <option value="movil">Servicio Móvil</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Logistics & Schedule */}
                            <div className="space-y-8">
                                <div>
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">
                                        <Clock size={16} /> Logística y Horarios
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 items-start">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Fecha Entrega</label>
                                                <input 
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white font-semibold outline-none text-xs md:text-sm cursor-pointer h-[50px] md:h-[52px]"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Horario Entrega <span className="text-slate-300 font-normal lowercase">(Opc)</span></label>
                                                <select className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white font-semibold outline-none text-xs md:text-sm cursor-pointer h-[50px] md:h-[52px]"
                                                    value={formData.deliveryTime} onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })}>
                                                    <option value="">Selección...</option>
                                                    <option value="7:00 AM - 8:00 AM">7:00 AM - 8:00 AM</option>
                                                    <option value="8:00 AM - 9:00 AM">8:00 AM - 9:00 AM</option>
                                                    <option value="9:00 AM - 10:00 AM">9:00 AM - 10:00 AM</option>
                                                    <option value="Tarde (2:00 PM - 5:00 PM)">Tarde (2-5PM)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 items-start">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Fecha Recogida</label>
                                                <input 
                                                    type="date"
                                                    value={formData.endDate}
                                                    min={formData.startDate}
                                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                    className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white font-semibold outline-none text-xs md:text-sm cursor-pointer h-[50px] md:h-[52px]"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Horario Recogida <span className="text-slate-300 font-normal lowercase">(Opc)</span></label>
                                                <select className="w-full border-2 border-slate-100 rounded-2xl px-4 py-3 bg-slate-50 focus:bg-white font-semibold outline-none text-xs md:text-sm cursor-pointer h-[50px] md:h-[52px]"
                                                    value={formData.collectionTime} onChange={e => setFormData({ ...formData, collectionTime: e.target.value })}>
                                                    <option value="">Selección...</option>
                                                    <option value="5:00 PM - 6:00 PM">5:00 PM - 6:00 PM</option>
                                                    <option value="6:00 PM - 7:00 PM">6:00 PM - 7:00 PM</option>
                                                    <option value="Mañana (8:00 AM - 12:00 PM)">Mañana (8-12PM)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Dirección <span className="text-slate-300 font-normal lowercase">(Opcional)</span></label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-4 text-slate-300" size={18} />
                                                <textarea rows={2} className="w-full border-2 border-slate-100 rounded-2xl pl-11 pr-5 py-3.5 bg-slate-50 focus:bg-white font-semibold outline-none resize-none text-sm"
                                                    placeholder="Calle 123 #45-67, Edificio... Medellín"
                                                    value={formData.clientAddress} onChange={e => setFormData({ ...formData, clientAddress: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1 block">Estado del Servicio</label>
                                            <select className="w-full border-2 border-slate-100 rounded-2xl px-5 py-3.5 bg-slate-50 focus:bg-white font-bold text-slate-800 outline-none text-sm cursor-pointer"
                                                value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                                <option value="pending_delivery">🟡 Pendiente de Entregar</option>
                                                <option value="delivered">🟢 Entregado (En Cliente)</option>
                                                <option value="pending_pickup">🔴 Pendiente por Recoger</option>
                                                <option value="completed">⚫ Finalizado</option>
                                                <option value="maintenance">🛠️ Bloqueo / Mantenimiento</option>
                                                <option value="cancelled">❌ Cancelado</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 3: Equipment & Extras */}
                            <div className="space-y-8">
                                <div>
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-3">
                                        <Tag size={16} /> Equipaje y Transductores
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 relative">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2">Mindray Z6</span>
                                                <div className="flex items-center gap-3">
                                                    <button type="button" onClick={() => setFormData(p => ({ ...p, quantityZ6: Math.max(0, p.quantityZ6 - 1) }))}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center font-black text-xl text-slate-800">{formData.quantityZ6}</span>
                                                    <button type="button" disabled={formData.quantityZ6 >= availableStock.z6}
                                                        onClick={() => setFormData(p => ({ ...p, quantityZ6: Math.min(availableStock.z6, p.quantityZ6 + 1) }))}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <div className="absolute -top-2 right-2 px-2 py-0.5 bg-blue-600 text-[8px] font-black text-white rounded-full shadow-sm">
                                                    Disp: {availableStock.z6 - formData.quantityZ6}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 relative">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2">Mindray Z60</span>
                                                <div className="flex items-center gap-3">
                                                    <button type="button" onClick={() => setFormData(p => ({ ...p, quantityZ60: Math.max(0, p.quantityZ60 - 1) }))}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center font-black text-xl text-slate-800">{formData.quantityZ60}</span>
                                                    <button type="button" disabled={formData.quantityZ60 >= availableStock.z60}
                                                        onClick={() => setFormData(p => ({ ...p, quantityZ60: Math.min(availableStock.z60, p.quantityZ60 + 1) }))}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <div className="absolute -top-2 right-2 px-2 py-0.5 bg-blue-600 text-[8px] font-black text-white rounded-full shadow-sm">
                                                    Disp: {availableStock.z60 - formData.quantityZ60}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 relative">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2">Mindray M7</span>
                                                <div className="flex items-center gap-3">
                                                    <button type="button" onClick={() => setFormData(p => ({ ...p, quantityM7: Math.max(0, p.quantityM7 - 1) }))}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center font-black text-xl text-slate-800">{formData.quantityM7}</span>
                                                    <button type="button" disabled={formData.quantityM7 >= availableStock.m7}
                                                        onClick={() => setFormData(p => ({ ...p, quantityM7: Math.min(availableStock.m7, p.quantityM7 + 1) }))}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <div className="absolute -top-2 right-2 px-2 py-0.5 bg-blue-600 text-[8px] font-black text-white rounded-full shadow-sm">
                                                    Disp: {availableStock.m7 - formData.quantityM7}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 relative">
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-2">Mindray MX3</span>
                                                <div className="flex items-center gap-3">
                                                    <button type="button" onClick={() => setFormData(p => ({ ...p, quantityMx3: Math.max(0, p.quantityMx3 - 1) }))}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-8 text-center font-black text-xl text-slate-800">{formData.quantityMx3}</span>
                                                    <button type="button" disabled={formData.quantityMx3 >= availableStock.mx3}
                                                        onClick={() => setFormData(p => ({ ...p, quantityMx3: Math.min(availableStock.mx3, p.quantityMx3 + 1) }))}
                                                        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                                <div className="absolute -top-2 right-2 px-2 py-0.5 bg-blue-600 text-[8px] font-black text-white rounded-full shadow-sm">
                                                    Disp: {availableStock.mx3 - formData.quantityMx3}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">Transductores</span>
                                            <div className="flex flex-wrap gap-2">
                                                {['Convexo', 'Lineal', 'Transvaginal', 'Sectorial'].map(t => (
                                                    <button key={t} type="button" onClick={() => toggleTransducer(t)}
                                                        className={`px-4 py-2 rounded-full text-xs font-bold border-2 transition-all ${formData.selectedTransducers.includes(t) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'}`}>
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${formData.includeCart ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}
                                                onClick={() => setFormData(p => ({ ...p, includeCart: !p.includeCart }))}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.includeCart ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>🛒</div>
                                                    <span className="text-xs font-black text-slate-700">Base Rodable (Carrito)</span>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.includeCart ? 'bg-blue-600 border-blue-600' : 'border-slate-200'}`}>
                                                    {formData.includeCart && <X size={12} className="text-white rotate-45" strokeWidth={4} />}
                                                </div>
                                            </div>
                                            <div className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${formData.includePrinter ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100'}`}
                                                onClick={() => setFormData(p => ({ ...p, includePrinter: !p.includePrinter }))}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.includePrinter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>🖨️</div>
                                                    <span className="text-xs font-black text-slate-700">Impresora Sony</span>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.includePrinter ? 'bg-blue-600 border-blue-600' : 'border-slate-200'}`}>
                                                    {formData.includePrinter && <X size={12} className="text-white rotate-45" strokeWidth={4} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            {bookingToEdit && (
                                <button disabled={isLoading} type="button" onClick={() => setShowDeleteConfirm(true)}
                                    className="px-8 bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all">
                                    {isBlockingMode ? 'Eliminar Bloqueo' : 'Eliminar Reserva'}
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                            {!isBlockingMode && (
                                <div className="text-right hidden sm:block mr-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Total</p>
                                    <p className="text-2xl font-black text-slate-900 leading-none">${getTotalPrice().toLocaleString()}</p>
                                </div>
                            )}
                            <button disabled={isLoading} type="submit"
                                className={`flex-1 md:flex-none px-12 text-white font-black py-4 rounded-2xl transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 text-lg ${isBlockingMode ? 'bg-slate-900 hover:bg-black' : 'bg-slate-900 hover:bg-slate-800'}`}>
                                {isLoading ? 'Procesando...' : (
                                    isBlockingMode
                                        ? (bookingToEdit ? 'Actualizar Bloqueo' : 'Confirmar Bloqueo')
                                        : (bookingToEdit ? 'Actualizar Logística' : 'Guardar Nueva Reserva')
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Delete Confirm */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-10 z-10 rounded-3xl md:rounded-[40px]">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                            <X size={40} className="text-red-600" />
                        </div>
                        <h3 className="font-black text-2xl text-slate-900 mb-2">{isBlockingMode ? '¿Eliminar Bloqueo?' : '¿Eliminar Reserva?'}</h3>
                        <p className="text-slate-500 text-center mb-10">Esta acción es irreversible y no se puede deshacer.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowDeleteConfirm(false)}
                                className="px-8 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all">
                                Cancelar
                            </button>
                            <button disabled={isLoading} onClick={handleDelete}
                                className="px-8 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all disabled:opacity-50">
                                {isLoading ? 'Eliminando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
