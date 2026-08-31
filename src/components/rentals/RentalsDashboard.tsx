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
  FileText
} from 'lucide-react';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { ExportDropdown } from '../shared/ExportDropdown';
import { exportToExcel } from '../../utils/exportUtils';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabaseClient';
import { AdminBookingModal } from './AdminBookingModal';
import { cn } from '../../types';

export function RentalsDashboard() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    activeRentals: 0,
    mrr: 0,
    occupancyRate: 0,
    maintenanceCount: 0
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
    const active = data.filter(b => b.status === 'delivered').length;
    const maintenance = data.filter(b => b.status === 'maintenance').length;
    
    // MRR: Sum of total_price of delivered (active) rentals per month
    const totalActiveMRR = data
      .filter(b => b.status === 'delivered')
      .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

    // Occupancy Rate: Simplified mock calculation based on active machines out of total inventory (e.g. 6 total ecógrafos)
    const totalInventory = 6; 
    const busyMachines = data
      .filter(b => b.status === 'delivered')
      .reduce((sum, b) => sum + (b.quantity_z6 || 0) + (b.quantity_z60 || 0) + (b.quantity_m7 || 0) + (b.quantity_mx3 || 0), 0);
    const occupancy = totalInventory > 0 ? Math.min(Math.round((busyMachines / totalInventory) * 100), 100) : 0;

    setStats({
      activeRentals: active,
      mrr: totalActiveMRR,
      occupancyRate: occupancy,
      maintenanceCount: maintenance
    });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter & Search Logic
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      (b.client_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.document_number || '').includes(searchQuery) ||
      (b.client_email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_confirmation':
        return <Badge variant="warning">En Reposo</Badge>;
      case 'pending_delivery':
        return <Badge variant="info">Pte. Entrega</Badge>;
      case 'delivered':
        return <Badge variant="success">Entregado</Badge>;
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
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
            <ClipboardList className="text-brand shrink-0" size={24} />
            Alquileres
          </h1>
          <p className="text-sm text-white/50">Control de reservas, bloqueos y logística de ecógrafos.</p>
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
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <Truck size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Activos en Clínica</span>
            <span className="text-2xl font-black text-white block mt-0.5">{stats.activeRentals}</span>
          </div>
        </div>

        <div className="bg-card border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Ingreso Activo (MRR)</span>
            <span className="text-2xl font-black text-white block mt-0.5">${stats.mrr.toLocaleString('es-CO')}</span>
          </div>
        </div>

        <div className="bg-card border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Tasa de Ocupación</span>
            <span className="text-2xl font-black text-white block mt-0.5">{stats.occupancyRate}%</span>
          </div>
        </div>

        <div className="bg-card border border-white/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-wider block">Mantenimientos</span>
            <span className="text-2xl font-black text-white block mt-0.5">{stats.maintenanceCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-sm">
        {/* Search & Filters */}
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por médico, NIT, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={cn(
                "p-2.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all",
                showFilters 
                  ? "bg-brand/10 border-brand text-brand" 
                  : "bg-white/5 border-white/10 text-white/70 hover:text-white"
              )}
            >
              <Filter size={14} /> Filtros
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-800 text-white">Todos los Estados</option>
              <option value="pending_confirmation" className="bg-slate-800 text-white">En Reposo</option>
              <option value="pending_delivery" className="bg-slate-800 text-white">Pendiente Entrega</option>
              <option value="delivered" className="bg-slate-800 text-white">Entregado</option>
              <option value="pending_pickup" className="bg-slate-800 text-white">Pendiente Recogida</option>
              <option value="completed" className="bg-slate-800 text-white">Completado</option>
              <option value="maintenance" className="bg-slate-800 text-white">Mantenimiento</option>
              <option value="cancelled" className="bg-slate-800 text-white">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Filter Details panel */}
        {showFilters && (
          <div className="bg-white/5 p-4 border-b border-white/10 flex flex-wrap gap-2 animate-in fade-in duration-200">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest flex items-center mr-2">Filtros Activos:</span>
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
              <p className="text-xs text-white/40 mt-4">Consultando base de datos de alquileres...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <ClipboardList className="text-white/20 mx-auto" size={40} />
              <p className="text-sm font-bold text-white/70">No se encontraron alquileres</p>
              <p className="text-xs text-white/40">Prueba ajustando los filtros o realiza una reserva manual.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-white/40 text-[10px] font-black uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Fechas</th>
                  <th className="px-6 py-4">Equipos Contratados</th>
                  <th className="px-6 py-4">Valor Total</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredBookings.map((booking) => (
                  <tr 
                    key={booking.id} 
                    onClick={() => {
                      setSelectedBooking(booking);
                      setShowBookingModal(true);
                    }}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{booking.client_name}</div>
                      <div className="text-[10px] text-white/50">{booking.client_email || 'Sin correo'}</div>
                      <div className="text-[10px] font-semibold text-brand mt-0.5">{booking.document_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white font-semibold">{booking.start_date}</div>
                      <div className="text-xs text-white/40">al {booking.end_date}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white max-w-[280px] truncate">{getEquipmentSummary(booking)}</div>
                      <div className="text-[10px] text-white/50 mt-0.5">Dir: {booking.client_address}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-white">
                        ${(Number(booking.total_price) || 0).toLocaleString('es-CO')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-brand/20 hover:text-brand text-white/70 transition-colors"
                          title="Editar"
                        >
                          <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
