"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ClipboardList, 
  RefreshCw, 
  ChevronRight, 
  Filter, 
  X, 
  FileSpreadsheet, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Truck, 
  AlertTriangle,
  Plus,
  FileText,
  Clock,
  MapPin,
  Printer,
  ShoppingBag,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';

import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { ExportDropdown } from '../shared/ExportDropdown';
import { exportToExcel } from '../../utils/exportUtils';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabaseClient';
import { AdminBookingModal } from './AdminBookingModal';
import { RentalDetailView } from './RentalDetailView';
import { cn } from '../../types';

interface RentalsDashboardProps {
  mode?: 'all' | 'unconfirmed' | 'confirmed';
}

export function RentalsDashboard({ mode = 'all' }: RentalsDashboardProps) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [activeSegment, setActiveSegment] = useState<'all' | 'unconfirmed' | 'confirmed'>(mode);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const [viewingBookingId, setViewingBookingId] = useState<string | number | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    activeRentals: 0,
    mrr: 0,
    occupancyRate: 0,
    maintenanceCount: 0,
    unconfirmedCount: 0,
    confirmedCount: 0
  });

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setBookings(data);
        calculateStats(data);
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err);
      Swal.fire({
        title: 'Error',
        text: 'No se pudieron cargar los alquileres desde Supabase.',
        icon: 'error',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    const active = data.filter(b => b.status === 'delivered' || (b.start_date <= today && b.end_date >= today && b.status !== 'cancelled' && b.status !== 'maintenance'));
    const mrrTotal = active.reduce((acc, b) => acc + (Number(b.total_price) || 0), 0);
    const maintenance = data.filter(b => b.status === 'maintenance').length;
    
    // Contar alquileres por confirmar (sin pago o estado pending_confirmation)
    const unconfirmed = data.filter(b => 
      b.status === 'pending_confirmation' || (!b.payment_receipt_url && b.status !== 'cancelled' && b.status !== 'maintenance' && b.status !== 'completed')
    ).length;

    // Contar alquileres confirmados (con pago verificado o confirmados)
    const confirmed = data.filter(b => 
      b.payment_receipt_url || ['confirmed', 'in_transit', 'delivered', 'completed'].includes(b.status)
    ).length;

    setStats({
      activeRentals: active.length,
      mrr: mrrTotal,
      occupancyRate: Math.min(100, Math.round((active.length / 6) * 100)),
      maintenanceCount: maintenance,
      unconfirmedCount: unconfirmed,
      confirmedCount: confirmed
    });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  if (viewingBookingId) {
    return (
      <RentalDetailView
        bookingId={viewingBookingId}
        onBack={() => setViewingBookingId(null)}
        onUpdated={fetchBookings}
      />
    );
  }

  // Filter & Search Logic
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      (b.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.document_number || '').includes(searchQuery) ||
      (b.client_email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;

    // Segmentación: Por confirmar vs Confirmados
    let matchesSegment = true;
    const isPaidOrConfirmed = Boolean(b.payment_receipt_url) || ['confirmed', 'in_transit', 'delivered', 'completed'].includes(b.status);

    if (activeSegment === 'unconfirmed') {
      matchesSegment = !isPaidOrConfirmed || b.status === 'pending_confirmation';
    } else if (activeSegment === 'confirmed') {
      matchesSegment = isPaidOrConfirmed && b.status !== 'pending_confirmation';
    }
    
    return matchesSearch && matchesStatus && matchesSegment;
  });

  const getInitials = (name?: string) => {
    if (!name) return 'EC';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const formatDateDisplay = (startDateStr: string, endDateStr: string) => {
    if (!startDateStr) return { main: 'Sin fecha', sub: '', daysCount: 0 };
    
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const [sy, sm, sd] = startDateStr.split('-').map(Number);

    if (!endDateStr || startDateStr === endDateStr) {
      return {
        main: `${sd} ${months[sm - 1]} ${sy}`,
        sub: '1 día de alquiler',
        daysCount: 1
      };
    }

    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const daysCount = Math.max(1, Math.round(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    let main = '';
    if (sy === ey && sm === em) {
      main = `${sd} — ${ed} ${months[sm - 1]} ${sy}`;
    } else if (sy === ey) {
      main = `${sd} ${months[sm - 1]} — ${ed} ${months[em - 1]} ${sy}`;
    } else {
      main = `${sd} ${months[sm - 1]} ${sy} — ${ed} ${months[em - 1]} ${ey}`;
    }

    return {
      main,
      sub: `${daysCount} ${daysCount === 1 ? 'día' : 'días'}`,
      daysCount
    };
  };

  const renderEquipmentBadges = (booking: any) => {
    const items: React.ReactNode[] = [];

    if (booking.quantity_z6 > 0) {
      items.push(
        <span key="z6" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
          <span className="w-1 h-1 rounded-full bg-sky-500"></span>
          Mindray Z6
          {booking.quantity_z6 > 1 && (
            <span className="ml-0.5 text-[9px] font-black">×{booking.quantity_z6}</span>
          )}
        </span>
      );
    }
    if (booking.quantity_z60 > 0) {
      items.push(
        <span key="z60" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
          Mindray Z60
          {booking.quantity_z60 > 1 && (
            <span className="ml-0.5 text-[9px] font-black">×{booking.quantity_z60}</span>
          )}
        </span>
      );
    }
    if (booking.quantity_m7 > 0) {
      items.push(
        <span key="m7" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          <span className="w-1 h-1 rounded-full bg-blue-500"></span>
          Mindray M7
          {booking.quantity_m7 > 1 && (
            <span className="ml-0.5 text-[9px] font-black">×{booking.quantity_m7}</span>
          )}
        </span>
      );
    }
    if (booking.quantity_mx3 > 0) {
      items.push(
        <span key="mx3" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <span className="w-1 h-1 rounded-full bg-teal-500"></span>
          Mindray MX3
          {booking.quantity_mx3 > 1 && (
            <span className="ml-0.5 text-[9px] font-black">×{booking.quantity_mx3}</span>
          )}
        </span>
      );
    }

    if (booking.include_printer) {
      items.push(
        <span key="printer" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <Printer size={9} className="text-slate-500 shrink-0" />
          Impresora
        </span>
      );
    }

    if (booking.include_cart) {
      items.push(
        <span key="cart" className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <ShoppingBag size={9} className="text-slate-500 shrink-0" />
          Carrito
        </span>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          {items.length > 0 ? items : (
            <span className="text-[10px] text-text-muted italic">Sin equipos</span>
          )}
        </div>
        {booking.client_address && (
          <div className="flex items-center gap-1 text-[10px] text-text-secondary">
            <MapPin size={10} className="text-slate-400 shrink-0" />
            <span className="truncate max-w-[200px]" title={booking.client_address}>
              {booking.client_address}
            </span>
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_confirmation':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
            <Clock size={10} /> Por Confirmar
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
            <CheckCircle2 size={10} /> Confirmado
          </span>
        );
      case 'pending_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
            <Truck size={10} /> Pte. Entrega
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 whitespace-nowrap">
            <Truck size={10} /> En Camino
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            <CheckCircle2 size={10} /> Entregado / Activo
          </span>
        );
      case 'pending_pickup':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
            <AlertTriangle size={10} /> Pte. Recogida
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            Completado
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-100 border border-slate-800 whitespace-nowrap">
            Mantenimiento
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 whitespace-nowrap">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  const getEquipmentSummary = (booking: any) => {
    const parts = [];
    if (booking.quantity_z6 > 0) parts.push(`${booking.quantity_z6}x Mindray Z6`);
    if (booking.quantity_z60 > 0) parts.push(`${booking.quantity_z60}x Mindray Z60`);
    if (booking.quantity_m7 > 0) parts.push(`${booking.quantity_m7}x Mindray M7`);
    if (booking.quantity_mx3 > 0) parts.push(`${booking.quantity_mx3}x Mindray MX3`);
    if (booking.include_cart) parts.push('Carrito');
    if (booking.include_printer) parts.push('Impresora');
    return parts.join(', ') || 'Sin equipos';
  };

  const handleExport = (format: 'csv' | 'xml') => {
    const headers = [
      'ID', 'Cliente', 'Email', 'Telefono', 'Direccion', 'CC/NIT', 'Equipo', 
      'F. Inicio', 'F. Fin', 'Total', 'Estado'
    ];
    
    const rows = filteredBookings.map(b => ({
      'ID': b.id,
      'Cliente': b.client_name,
      'Email': b.client_email,
      'Telefono': b.client_phone,
      'Direccion': b.client_address,
      'CC/NIT': b.document_number,
      'Equipo': getEquipmentSummary(b),
      'F. Inicio': b.start_date,
      'F. Fin': b.end_date,
      'Total': `$${(Number(b.total_price) || 0).toLocaleString('es-CO')}`,
      'Estado': b.status
    }));

    if (format === 'csv') {
      exportToExcel(headers, rows, 'Alquileres_Ecografos');
    } else {
      exportToExcel(headers, rows, 'Alquileres_Ecografos');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase italic flex items-center gap-2">
            {mode === 'unconfirmed' ? (
              <>
                <Clock className="text-amber-500 shrink-0" size={24} />
                Alquileres Por Confirmar (Sin Pago)
              </>
            ) : mode === 'confirmed' ? (
              <>
                <ClipboardList className="text-emerald-500 shrink-0" size={24} />
                Alquileres Confirmados & Pagados
              </>
            ) : (
              <>
                <ClipboardList className="text-brand shrink-0" size={24} />
                Alquileres
              </>
            )}
          </h1>
          <p className="text-sm text-text-secondary">
            {mode === 'unconfirmed'
              ? 'Gestión de cotizaciones, solicitudes en espera de pago y reservas sin confirmar.'
              : mode === 'confirmed'
                ? 'Flota de ecógrafos con pagos verificados, contratos activos y en logística.'
                : 'Control global de reservas, bloqueos y logística de ecógrafos.'}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => {
              setSelectedBooking(null);
              setShowBookingModal(true);
            }} 
            variant="primary" 
            className="flex-1 sm:flex-none flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Nueva Reserva
          </Button>
          <ExportDropdown onExportCSV={() => handleExport('csv')} onExportXML={() => handleExport('xml')} />
          <button 
            onClick={fetchBookings} 
            className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Por Confirmar</span>
            <span className="text-2xl font-black text-amber-500 block mt-0.5">{stats.unconfirmedCount}</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Confirmados / Pagos</span>
            <span className="text-2xl font-black text-emerald-500 block mt-0.5">{stats.confirmedCount}</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Truck size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Activos en Clínica</span>
            <span className="text-2xl font-black text-text-primary block mt-0.5">{stats.activeRentals}</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Tasa de Ocupación</span>
            <span className="text-2xl font-black text-text-primary block mt-0.5">{stats.occupancyRate}%</span>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Pestañas Operativas de Navegación solo si mode === 'all' */}
        {mode === 'all' && (
          <div className="flex border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-4 pt-2 overflow-x-auto gap-2">
            <button
              onClick={() => setActiveSegment('all')}
              className={cn(
                "px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer",
                activeSegment === 'all'
                  ? "border-brand text-brand bg-white dark:bg-slate-900 rounded-t-xl"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              <span>Todos los Alquileres</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-text-primary font-bold">
                {bookings.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSegment('unconfirmed')}
              className={cn(
                "px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer",
                activeSegment === 'unconfirmed'
                  ? "border-amber-500 text-amber-500 bg-white dark:bg-slate-900 rounded-t-xl"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              <span>Por Confirmar / Sin Pago</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                {stats.unconfirmedCount}
              </span>
            </button>

            <button
              onClick={() => setActiveSegment('confirmed')}
              className={cn(
                "px-4 py-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer",
                activeSegment === 'confirmed'
                  ? "border-emerald-500 text-emerald-500 bg-white dark:bg-slate-900 rounded-t-xl"
                  : "border-transparent text-text-muted hover:text-text-primary"
              )}
            >
              <span>Confirmados / Pagados</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold">
                {stats.confirmedCount}
              </span>
            </button>
          </div>
        )}


        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-placeholder" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por médico, NIT, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100/50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-text-primary placeholder:text-text-placeholder text-sm focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={cn(
                "p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer",
                showFilters 
                  ? "bg-brand/10 border-brand text-brand" 
                  : "bg-slate-100/80 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 text-text-secondary hover:text-text-primary"
              )}
            >
              <Filter size={14} /> Filtros
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-text-primary text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-card text-text-primary">Todos los Estados</option>
              <option value="pending_confirmation" className="bg-card text-text-primary">Por Confirmar</option>
              <option value="confirmed" className="bg-card text-text-primary">Confirmado</option>
              <option value="pending_delivery" className="bg-card text-text-primary">Pendiente Entrega</option>
              <option value="delivered" className="bg-card text-text-primary">Entregado / Activo</option>
              <option value="pending_pickup" className="bg-card text-text-primary">Pendiente Recogida</option>
              <option value="completed" className="bg-card text-text-primary">Completado</option>
              <option value="maintenance" className="bg-card text-text-primary">Mantenimiento</option>
              <option value="cancelled" className="bg-card text-text-primary">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Filter Details panel */}
        {showFilters && (
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border-b border-slate-200/60 dark:border-slate-800 flex flex-wrap gap-2 animate-in fade-in duration-200">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center mr-2">Filtros Activos:</span>
            {statusFilter !== 'ALL' && (
              <span className="bg-brand/10 text-brand text-xs px-2.5 py-1 rounded-lg border border-brand/20 flex items-center gap-1.5 font-semibold">
                Estado: {statusFilter}
                <X size={12} className="cursor-pointer" onClick={() => setStatusFilter('ALL')} />
              </span>
            )}
            {searchQuery && (
              <span className="bg-brand/10 text-brand text-xs px-2.5 py-1 rounded-lg border border-brand/20 flex items-center gap-1.5 font-semibold">
                Búsqueda: {searchQuery}
                <X size={12} className="cursor-pointer" onClick={() => setSearchQuery('')} />
              </span>
            )}
          </div>
        )}

        {/* Table View */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
              <p className="text-xs text-text-muted mt-4">Consultando base de datos de alquileres...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ClipboardList className="text-text-placeholder mx-auto" size={40} />
              <p className="text-sm font-bold text-text-secondary">
                {activeSegment === 'unconfirmed' 
                  ? 'No hay alquileres pendientes de confirmación o pago' 
                  : activeSegment === 'confirmed'
                    ? 'No hay alquileres confirmados en este momento'
                    : 'No se encontraron alquileres'}
              </p>
              <p className="text-xs text-text-muted">Prueba cambiando de pestaña o crea una nueva reserva.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-slate-800 text-text-muted text-[10px] font-black uppercase tracking-wider">
                  <th className="px-3 py-2.5 w-[22%]">Cliente</th>
                  <th className="px-3 py-2.5 w-[16%] whitespace-nowrap">Fechas</th>
                  <th className="px-3 py-2.5 w-[25%]">Equipos y Ubicación</th>
                  <th className="px-3 py-2.5 w-[12%] whitespace-nowrap">Valor Total</th>
                  <th className="px-3 py-2.5 w-[11%] whitespace-nowrap">Pago</th>
                  <th className="px-3 py-2.5 w-[11%] whitespace-nowrap">Estado</th>
                  <th className="px-2 py-2.5 w-[3%] text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                {filteredBookings.map((booking) => {
                  const isPaid = Boolean(booking.payment_receipt_url);
                  const dateInfo = formatDateDisplay(booking.start_date, booking.end_date);
                  return (
                    <tr 
                      key={booking.id} 
                      onClick={() => {
                        setViewingBookingId(booking.id);
                      }}
                      className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-all duration-150 cursor-pointer group"
                    >
                      {/* Cliente */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-brand font-black text-[10px] flex items-center justify-center shrink-0 border border-brand/20">
                            {getInitials(booking.client_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-text-primary group-hover:text-brand transition-colors text-xs leading-snug truncate max-w-[160px]" title={booking.client_name}>
                              {booking.client_name || 'Sin nombre'}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {booking.document_number && (
                                <span className="inline-block text-[9px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1 py-0.2 rounded border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                                  {booking.document_number}
                                </span>
                              )}
                              <span className="text-[10px] text-text-secondary truncate max-w-[110px]" title={booking.client_email}>
                                {booking.client_email || ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Fechas */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/40">
                            <CalendarDays size={12} />
                          </div>
                          <div>
                            <div className="font-semibold text-text-primary text-[11px] leading-tight">
                              {dateInfo.main}
                            </div>
                            <div className="text-[9px] font-semibold text-text-muted mt-0.5 flex items-center gap-1">
                              <span className="inline-block w-1 h-1 rounded-full bg-blue-500"></span>
                              {dateInfo.sub}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Equipos & Ubicación */}
                      <td className="px-3 py-2.5">
                        {renderEquipmentBadges(booking)}
                      </td>

                      {/* Valor Total */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-text-primary text-xs">
                          ${(Number(booking.total_price) || 0).toLocaleString('es-CO')}
                        </div>
                        <div className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">
                          COP
                        </div>
                      </td>

                      {/* Pago */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Pagado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Sin Pago
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>

                      {/* Acciones */}
                      <td className="px-2 py-2.5 text-right whitespace-nowrap">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-brand group-hover:text-white transition-all ml-auto">
                          <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Admin Booking Modal */}
      {showBookingModal && (
        <AdminBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            fetchBookings();
          }}
          bookingToEdit={selectedBooking}
        />
      )}
    </div>
  );
}
