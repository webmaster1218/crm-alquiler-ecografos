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
  Clock
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_confirmation':
        return <Badge variant="warning">Por Confirmar</Badge>;
      case 'confirmed':
        return <Badge variant="info">Confirmado</Badge>;
      case 'pending_delivery':
        return <Badge variant="info">Pte. Entrega</Badge>;
      case 'in_transit':
        return <Badge variant="info">En Camino</Badge>;
      case 'delivered':
        return <Badge variant="success">Entregado / Activo</Badge>;
      case 'pending_pickup':
        return <Badge variant="danger">Pte. Recogida</Badge>;
      case 'completed':
        return <Badge variant="default">Completado</Badge>;
      case 'maintenance':
        return <Badge variant="default" className="bg-slate-900 text-slate-100">Mantenimiento</Badge>;
      case 'cancelled':
        return <Badge variant="default">Cancelado</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getEquipmentSummary = (booking: any) => {
    const parts = [];
    if (booking.quantity_z6 > 0) parts.push(`${booking.quantity_z6}x Z6`);
    if (booking.quantity_z60 > 0) parts.push(`${booking.quantity_z60}x Z60`);
    if (booking.quantity_m7 > 0) parts.push(`${booking.quantity_m7}x M7`);
    if (booking.quantity_mx3 > 0) parts.push(`${booking.quantity_mx3}x MX3`);
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
                <tr className="bg-slate-50 dark:bg-slate-950/20 border-b border-slate-200/60 dark:border-slate-800 text-text-muted text-[10px] font-black uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Fechas</th>
                  <th className="px-6 py-4">Equipos Contratados</th>
                  <th className="px-6 py-4">Valor Total</th>
                  <th className="px-6 py-4">Pago</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm">
                {filteredBookings.map((booking) => {
                  const isPaid = Boolean(booking.payment_receipt_url);
                  return (
                    <tr 
                      key={booking.id} 
                      onClick={() => {
                        setViewingBookingId(booking.id);
                      }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary">{booking.client_name}</div>
                        <div className="text-[10px] text-text-secondary">{booking.client_email || 'Sin correo'}</div>
                        <div className="text-[10px] font-semibold text-brand mt-0.5">{booking.document_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-text-primary font-semibold">{booking.start_date}</div>
                        <div className="text-xs text-text-muted">al {booking.end_date}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-text-primary max-w-[280px] truncate">{getEquipmentSummary(booking)}</div>
                        <div className="text-[10px] text-text-secondary mt-0.5">Dir: {booking.client_address}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-text-primary">
                          ${(Number(booking.total_price) || 0).toLocaleString('es-CO')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                            ● Pagado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                            ○ Sin Pago
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingBookingId(booking.id);
                          }} 
                          variant="ghost" 
                          size="sm"
                          className="group-hover:bg-brand group-hover:text-white"
                        >
                          <ChevronRight size={16} />
                        </Button>
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
