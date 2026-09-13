"use client";

import React, { useState } from 'react';
import { Calendar as CalendarIcon, FileSpreadsheet, RefreshCw, Plus, ShieldAlert, Settings } from 'lucide-react';

import { BookingsCalendar } from '../../../components/rentals/BookingsCalendar';
import { AdminBookingModal } from '../../../components/rentals/AdminBookingModal';
import StockSettingsModal from '../../../components/rentals/StockSettingsModal';
import { RentalDetailView } from '../../../components/rentals/RentalDetailView';
import { exportToExcel } from '../../../utils/exportUtils';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function CalendarioPage() {
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [viewingBookingId, setViewingBookingId] = useState<string | number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [isBlockingMode, setIsBlockingMode] = useState(false);
  const [initialRange, setInitialRange] = useState<{ start: string; end: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditBooking = async (item: any) => {
    if (item?.isBlock) {
      const equipNames = [];
      if (item.quantity_z6 > 0) equipNames.push(`${item.quantity_z6}x Mindray Z6`);
      if (item.quantity_z60 > 0) equipNames.push(`${item.quantity_z60}x Mindray Z60`);
      if (item.quantity_m7 > 0) equipNames.push(`${item.quantity_m7}x Mindray M7`);
      if (item.quantity_mx3 > 0) equipNames.push(`${item.quantity_mx3}x Mindray MX3`);

      const res = await Swal.fire({
        title: '🔧 ' + (item.tipo === 'mantenimiento' ? 'Mantenimiento Técnico' : 'Bloqueo Administrativo'),
        html: `
          <div style="text-align: left; font-size: 13px; line-height: 1.6; padding: 4px 8px;">
            <p><strong>Equipos:</strong> ${equipNames.join(', ') || 'Flota general'}</p>
            <p><strong>Período:</strong> ${item.start_date} al ${item.end_date}</p>
            <p><strong>Motivo:</strong> ${item.motivo || 'Sin observaciones'}</p>
            <p><strong>Responsable:</strong> ${item.responsable || 'Administrador'}</p>
          </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#3b82f6',
        denyButtonText: '🗑️ Liberar / Desbloquear',
        denyButtonColor: '#ef4444',
      });

      if (res.isDenied) {
        const confirmDelete = await Swal.fire({
          title: '¿Liberar ecógrafo?',
          text: 'El equipo volverá a estar disponible para reservas en estas fechas.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, liberar',
          confirmButtonColor: '#ef4444',
          cancelButtonText: 'Cancelar'
        });

        if (confirmDelete.isConfirmed) {
          const { error } = await supabase.from('bloqueos_equipos').delete().eq('id', item.id);
          if (error) {
            Swal.fire('Error', 'No se pudo eliminar el bloqueo: ' + error.message, 'error');
          } else {
            Swal.fire('Liberado', 'El equipo ha sido desbloqueado correctamente.', 'success');
            setRefreshKey(prev => prev + 1);
          }
        }
      }
    } else if (item?.id) {
      setViewingBookingId(item.id);
    } else {
      setSelectedBooking(item);
      setInitialRange(null);
      setIsBlockingMode(false);
      setShowModal(true);
    }
  };

  const handleCreateBooking = (start: Date, end: Date) => {
    setSelectedBooking(null);
    setInitialRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
    setIsBlockingMode(false);
    setShowModal(true);
  };

  if (viewingBookingId) {
    return (
      <RentalDetailView
        bookingId={viewingBookingId}
        onBack={() => setViewingBookingId(null)}
        onUpdated={() => setRefreshKey(prev => prev + 1)}
      />
    );
  }

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .neq('status', 'cancelled');

      if (error) throw error;

      if (data) {
        const headers = ['ID', 'Cliente', 'Celular', 'Direccion', 'F. Inicio', 'F. Fin', 'Equipos', 'Estado'];
        const rows = data.map(b => {
          const equipments = [];
          if (b.quantity_z6 > 0) equipments.push(b.quantity_z6 > 1 ? `${b.quantity_z6}x Mindray Z6` : 'Mindray Z6');
          if (b.quantity_z60 > 0) equipments.push(b.quantity_z60 > 1 ? `${b.quantity_z60}x Mindray Z60` : 'Mindray Z60');
          if (b.quantity_m7 > 0) equipments.push(b.quantity_m7 > 1 ? `${b.quantity_m7}x Mindray M7` : 'Mindray M7');
          if (b.quantity_mx3 > 0) equipments.push(b.quantity_mx3 > 1 ? `${b.quantity_mx3}x Mindray MX3` : 'Mindray MX3');
          if (b.include_printer) equipments.push('Impresora');
          if (b.include_cart) equipments.push('Carrito');

          return {
            'ID': b.id,
            'Cliente': b.client_name,
            'Celular': b.client_phone,
            'Direccion': b.client_address,
            'F. Inicio': b.start_date,
            'F. Fin': b.end_date,
            'Equipos': equipments.join(', ') || 'Mantenimiento',
            'Estado': b.status
          };
        });

        exportToExcel(headers, rows, 'Calendario_Alquileres_Ecografos');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo exportar la programación.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase italic flex items-center gap-2">
            <CalendarIcon className="text-brand shrink-0" size={24} />
            Calendario Logístico
          </h1>
          <p className="text-sm text-text-secondary">Planificación de despachos, recogidas y bloqueos técnicos de flota.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Ajustar Stock */}
          <button
            onClick={() => setShowStockModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-primary rounded-xl text-xs font-bold transition-all border border-slate-200/60 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer"
            title="Configurar inventario total de ecógrafos"
          >
            <Settings size={15} /> Ajustar Stock
          </button>

          {/* Bloquear Fechas */}
          <button
            onClick={() => {
              setSelectedBooking(null);
              setInitialRange(null);
              setIsBlockingMode(true);
              setShowModal(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ShieldAlert size={15} className="text-amber-400" /> Bloquear Fechas
          </button>

          {/* Nueva Reserva */}
          <button
            onClick={() => {
              setSelectedBooking(null);
              setInitialRange(null);
              setIsBlockingMode(false);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Nueva Reserva
          </button>

          <button 
            onClick={handleExport}
            className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Exportar a Excel"
          >
            <FileSpreadsheet size={15} />
          </button>

          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Actualizar calendario"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-4 md:p-6 rounded-3xl shadow-sm">
        <BookingsCalendar 
          key={refreshKey}
          onEditBooking={handleEditBooking}
          onCreateBooking={handleCreateBooking}
        />
      </div>

      {/* Booking / Blocking Modal */}
      {showModal && (
        <AdminBookingModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            setRefreshKey(prev => prev + 1);
          }}
          bookingToEdit={selectedBooking}
          initialDateRange={initialRange}
          isBlockingMode={isBlockingMode}
        />
      )}

      {/* Stock Settings Modal */}
      {showStockModal && (
        <StockSettingsModal
          isOpen={showStockModal}
          onClose={() => setShowStockModal(false)}
          onSuccess={() => {
            setShowStockModal(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}

