"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  HeartPulse, 
  Calendar as CalendarIcon, 
  Search, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Eye,
  RefreshCw,
  Plus
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { getTotalStock } from '../../../lib/availability';
import StockSettingsModal from '../../../components/rentals/StockSettingsModal';
import { AdminBookingModal } from '../../../components/rentals/AdminBookingModal';
import { RentalDetailView } from '../../../components/rentals/RentalDetailView';


interface EquipmentModel {
  id: 'z6' | 'z60' | 'm7' | 'mx3';
  name: string;
  tag: string;
  category: string;
  pricePerDay: number;
  description: string;
  color: string;
  bgLight: string;
  borderLight: string;
}

const EQUIPMENT_MODELS: EquipmentModel[] = [
  {
    id: 'z6',
    name: 'Mindray Z6',
    tag: 'Gama Media Portátil',
    category: 'Obstetricia / Abdominal / General',
    pricePerDay: 350000,
    description: 'Ecógrafo portátil de alta definición para diagnóstico general, Doppler color y ginecología.',
    color: 'text-blue-500',
    bgLight: 'bg-blue-500/10',
    borderLight: 'border-blue-500/20'
  },
  {
    id: 'z60',
    name: 'Mindray Z60',
    tag: 'Gama Alta Especializada',
    category: 'Músculo-Esquelético / Vascular / Avanzado',
    pricePerDay: 550000,
    description: 'Tecnología 3D/4D avanzada, elastografía natural touch y procesamiento de imagen de alta fidelidad.',
    color: 'text-indigo-500',
    bgLight: 'bg-indigo-500/10',
    borderLight: 'border-indigo-500/20'
  },
  {
    id: 'm7',
    name: 'Mindray M7',
    tag: 'Cardiovascular Premium',
    category: 'Ecocardiografía / Vascular Periférico',
    pricePerDay: 650000,
    description: 'Equipo cardiovascular de referencia con transductores phased array y software cardiaco dedicado.',
    color: 'text-violet-500',
    bgLight: 'bg-violet-500/10',
    borderLight: 'border-violet-500/20'
  },
  {
    id: 'mx3',
    name: 'Mindray MX3',
    tag: 'Nueva Generación Portátil',
    category: 'Point of Care / Urgencias / UCI',
    pricePerDay: 600000,
    description: 'Arquitectura táctil ultraportátil ligera diseñada para quirófano, anestesia y respuesta rápida.',
    color: 'text-emerald-500',
    bgLight: 'bg-emerald-500/10',
    borderLight: 'border-emerald-500/20'
  }
];

export default function DispositivosPage() {
  const [selectedModel, setSelectedModel] = useState<'z6' | 'z60' | 'm7' | 'mx3'>('z6');
  const [stock, setStock] = useState({ z6: 2, z60: 2, m7: 1, mx3: 1 });
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date selector for simulation & checking
  const [targetDate, setTargetDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [durationDays, setDurationDays] = useState<number>(1);

  // Month navigation for Timeline view
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  // Modals & Navigation
  const [showStockModal, setShowStockModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isBlockingMode, setIsBlockingMode] = useState(false);
  const [viewingBookingId, setViewingBookingId] = useState<string | number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const stockData = await getTotalStock();
      setStock({
        z6: stockData.z6,
        z60: stockData.z60,
        m7: stockData.m7,
        mx3: (stockData as any).mx3 || 1
      });

      if (supabase) {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .neq('status', 'cancelled')
          .order('start_date', { ascending: true });

        if (error) throw error;
        setBookings(data || []);
      }
    } catch (err) {
      console.error('Error fetching equipment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter bookings for the selected model
  const modelBookings = useMemo(() => {
    return bookings.filter(b => {
      const qty = b[`quantity_${selectedModel}`] || 0;
      return qty > 0;
    });
  }, [bookings, selectedModel]);

  // Current active rentals right now for this model
  const activeNow = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return modelBookings.filter(b => b.start_date <= todayStr && b.end_date >= todayStr);
  }, [modelBookings]);

  const unitsInUseNow = useMemo(() => {
    return activeNow.reduce((sum, b) => sum + (b[`quantity_${selectedModel}`] || 0), 0);
  }, [activeNow, selectedModel]);

  const totalUnitsForModel = stock[selectedModel] || 1;
  const unitsAvailableNow = Math.max(0, totalUnitsForModel - unitsInUseNow);

  // Availability on targeted simulation date
  const targetedBookings = useMemo(() => {
    if (!targetDate) return [];
    
    // Calculate end date of desired rental
    const start = new Date(targetDate);
    const end = new Date(start);
    end.setDate(end.getDate() + (durationDays - 1));
    const endStr = end.toISOString().split('T')[0];

    return modelBookings.filter(b => b.start_date <= endStr && b.end_date >= targetDate);
  }, [modelBookings, targetDate, durationDays]);

  const unitsBlockedOnTarget = useMemo(() => {
    return targetedBookings.reduce((sum, b) => sum + (b[`quantity_${selectedModel}`] || 0), 0);
  }, [targetedBookings, selectedModel]);

  const unitsAvailableOnTarget = Math.max(0, totalUnitsForModel - unitsBlockedOnTarget);

  // Generate calendar days for the timeline of the current month
  const monthDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // Calculate units in use for this specific day
      const dayBookings = modelBookings.filter(b => b.start_date <= dateStr && b.end_date >= dateStr);
      const usedUnits = dayBookings.reduce((sum, b) => sum + (b[`quantity_${selectedModel}`] || 0), 0);
      const available = Math.max(0, totalUnitsForModel - usedUnits);

      days.push({
        dayNumber: d,
        dateStr,
        usedUnits,
        availableUnits: available,
        isFullyBooked: available === 0,
        bookings: dayBookings
      });
    }
    return days;
  }, [currentMonth, modelBookings, totalUnitsForModel, selectedModel]);

  const currentModelConfig = EQUIPMENT_MODELS.find(m => m.id === selectedModel) || EQUIPMENT_MODELS[0];

  if (viewingBookingId) {
    return (
      <RentalDetailView
        bookingId={viewingBookingId}
        onBack={() => setViewingBookingId(null)}
        onUpdated={fetchData}
      />
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase italic flex items-center gap-2">
            <HeartPulse className="text-brand shrink-0" size={24} />
            Flota de Ecógrafos & Stock
          </h1>
          <p className="text-sm text-text-secondary">
            Consulta la disponibilidad en tiempo real por cada modelo, programa reservas y ajusta el inventario.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowStockModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-primary rounded-xl text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Settings size={15} /> Ajustar Stock Total
          </button>

          <button
            onClick={() => {
              setIsBlockingMode(true);
              setShowBookingModal(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ShieldAlert size={15} className="text-amber-400" /> Bloquear Mantenimiento
          </button>

          <button
            onClick={() => {
              setIsBlockingMode(false);
              setShowBookingModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Nueva Reserva
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Selector de Modelos de Ecógrafos (Tabs con Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {EQUIPMENT_MODELS.map(model => {
          const isSelected = selectedModel === model.id;
          const totalUnits = stock[model.id] || 0;
          
          // Contar unidades en uso hoy
          const todayStr = new Date().toISOString().split('T')[0];
          const inUseToday = bookings
            .filter(b => (b[`quantity_${model.id}`] || 0) > 0 && b.start_date <= todayStr && b.end_date >= todayStr)
            .reduce((sum, b) => sum + (b[`quantity_${model.id}`] || 0), 0);

          const freeToday = Math.max(0, totalUnits - inUseToday);

          return (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected 
                  ? 'bg-card border-brand shadow-md scale-[1.02]' 
                  : 'bg-card/70 hover:bg-card border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${model.bgLight} ${model.color}`}>
                    {model.tag}
                  </span>
                  <span className="text-xs font-black text-text-primary">
                    ${(model.pricePerDay / 1000).toFixed(0)}k/día
                  </span>
                </div>

                <h3 className="text-lg font-black text-text-primary">{model.name}</h3>
                <p className="text-xs text-text-secondary line-clamp-2">{model.description}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Stock Total</span>
                  <span className="text-sm font-black text-text-primary">{totalUnits} unids.</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Disponible Hoy</span>
                  <span className={`text-sm font-black ${freeToday > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {freeToday} {freeToday === 1 ? 'libre' : 'libres'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulación y Comprobador Rápido de Disponibilidad para Asesores */}
      <div className="bg-card border border-brand/20 dark:border-brand/30 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand block mb-1">
              HERRAMIENTA COMERCIAL DEL ASESOR
            </span>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Search className="text-brand" size={20} />
              Consultar Disponibilidad para Cotización: {currentModelConfig.name}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Ingresa la fecha y duración del servicio para saber inmediatamente si puedes prometer el equipo al médico.
            </p>
          </div>

          {/* Resultado directo */}
          <div className="flex items-center gap-3">
            <div className={`px-4 py-3 rounded-2xl border flex items-center gap-3 ${
              unitsAvailableOnTarget > 0 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              {unitsAvailableOnTarget > 0 ? (
                <CheckCircle2 size={24} className="shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle size={24} className="shrink-0 text-rose-500" />
              )}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block">
                  {unitsAvailableOnTarget > 0 ? 'Equipo Disponible' : 'Sin Stock Para Esa Fecha'}
                </span>
                <strong className="text-base font-extrabold">
                  {unitsAvailableOnTarget} de {totalUnitsForModel} unidades libres
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Inputs de Simulación */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
          <div>
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1.5">
              Fecha de Inicio del Alquiler
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-text-primary text-sm font-semibold outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1.5">
              Duración (Días)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={durationDays}
              onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-text-primary text-sm font-semibold outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setIsBlockingMode(false);
                setShowBookingModal(true);
              }}
              disabled={unitsAvailableOnTarget <= 0}
              className="w-full py-2.5 px-4 bg-brand hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer h-[42px]"
            >
              <Plus size={15} /> Reservar {currentModelConfig.name} Ahora
            </button>
          </div>
        </div>
      </div>

      {/* Calendario / Timeline Mensual de Ocupación del Dispositivo */}
      <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <CalendarIcon className="text-brand" size={18} />
              Línea de Tiempo Mensual: {currentModelConfig.name}
            </h3>
            <p className="text-xs text-text-secondary">
              Visualiza día por día cuántos ecógrafos de este modelo están en clínica y cuáles están en bodega.
            </p>
          </div>

          {/* Navegación de Mes */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const prev = new Date(currentMonth);
                prev.setMonth(prev.getMonth() - 1);
                setCurrentMonth(prev);
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-xs font-black uppercase text-text-primary px-3 min-w-[120px] text-center">
              {currentMonth.toLocaleString('es-CO', { month: 'long', year: 'numeric' })}
            </span>

            <button
              onClick={() => {
                const next = new Date(currentMonth);
                next.setMonth(next.getMonth() + 1);
                setCurrentMonth(next);
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-text-primary transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Grid de días del mes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {monthDays.map(day => {
            const isToday = day.dateStr === new Date().toISOString().split('T')[0];
            const isSelectedTarget = day.dateStr === targetDate;

            return (
              <div
                key={day.dateStr}
                onClick={() => setTargetDate(day.dateStr)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[90px] ${
                  isSelectedTarget 
                    ? 'ring-2 ring-brand border-brand bg-brand/5' 
                    : day.isFullyBooked
                      ? 'bg-rose-500/10 border-rose-500/20'
                      : day.usedUnits > 0
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${isToday ? 'px-1.5 py-0.5 rounded bg-blue-600 text-white' : 'text-text-primary'}`}>
                    {day.dayNumber}
                  </span>
                  <span className={`text-[9px] font-bold uppercase ${
                    day.isFullyBooked 
                      ? 'text-rose-500' 
                      : day.usedUnits > 0 
                        ? 'text-amber-500' 
                        : 'text-emerald-500'
                  }`}>
                    {day.isFullyBooked ? 'Agotado' : `${day.availableUnits} Disp.`}
                  </span>
                </div>

                <div className="mt-2 space-y-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        day.isFullyBooked ? 'bg-rose-500' : day.usedUnits > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${(day.usedUnits / totalUnitsForModel) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted block">
                    {day.usedUnits}/{totalUnitsForModel} en uso
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span>Disponible 100%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Ocupación Parcial</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span>Sin Stock / Agotado</span>
          </div>
        </div>
      </div>

      {/* Lista de Alquileres Activos o Programados de Este Dispositivo */}
      <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <Clock className="text-brand" size={18} />
          Reservas Vigentes y Próximas de {currentModelConfig.name} ({modelBookings.length})
        </h3>

        {modelBookings.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <p className="text-sm text-text-secondary">No hay reservas programadas para este modelo en este momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-text-muted uppercase text-[10px] font-black tracking-wider border-b border-slate-200/60 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Cliente / Destino</th>
                  <th className="py-3 px-4">Cantidad</th>
                  <th className="py-3 px-4">Periodo de Alquiler</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {modelBookings.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4">
                      <strong className="text-text-primary block font-bold">{b.client_name}</strong>
                      <span className="text-text-muted text-[11px]">{b.client_address || 'Medellín'}</span>
                    </td>
                    <td className="py-3 px-4 font-black text-brand">
                      {b[`quantity_${selectedModel}`]}x {currentModelConfig.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-text-primary font-semibold block">{b.start_date} al {b.end_date}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setViewingBookingId(b.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand hover:text-white text-text-primary transition-all font-bold flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Eye size={13} /> Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ajustar Stock */}
      {showStockModal && (
        <StockSettingsModal
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          onSuccess={() => {
            setShowStockModal(false);
            fetchData();
          }}
        />
      )}

      {/* Modal Crear Reserva o Bloqueo */}
      {showBookingModal && (
        <AdminBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            fetchData();
          }}
          isBlockingMode={isBlockingMode}
          initialDateRange={targetDate ? { start: targetDate, end: targetDate } : null}
        />
      )}
    </div>
  );
}
