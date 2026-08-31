"use client";

import React, { useState } from 'react';
import { Calendar as CalendarIcon, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { BookingsCalendar } from '../../../components/rentals/BookingsCalendar';
import { AdminBookingModal } from '../../../components/rentals/AdminBookingModal';
import { exportToExcel } from '../../../utils/exportUtils';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function CalendarioPage() {
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [initialRange, setInitialRange] = useState<{ start: string; end: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEditBooking = (booking: any) => {
    setSelectedBooking(booking);
    setInitialRange(null);
    setShowModal(true);
  };

  const handleCreateBooking = (start: Date, end: Date) => {
    setSelectedBooking(null);
    setInitialRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
    setShowModal(true);
  };

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
          if (b.quantity_z6 > 0) equipments.push(`${b.quantity_z6}x Z6`);
          if (b.quantity_z60 > 0) equipments.push(`${b.quantity_z60}x Z60`);
          if (b.quantity_m7 > 0) equipments.push(`${b.quantity_m7}x M7`);
          if (b.quantity_mx3 > 0) equipments.push(`${b.quantity_mx3}x MX3`);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic flex items-center gap-2">
            <CalendarIcon className="text-brand shrink-0" size={24} />
            Calendario Logístico
          </h1>
          <p className="text-sm text-white/50">Planificación de despachos, recogidas y mantenimientos de ecógrafos.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
          >
            <FileSpreadsheet size={14} /> Exportar Reporte
          </button>
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-card border border-white/10 p-4 rounded-2xl shadow-sm">
        <BookingsCalendar 
          key={refreshKey}
          onEditBooking={handleEditBooking}
          onCreateBooking={handleCreateBooking}
        />
      </div>

      {/* Booking Modal */}
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
        />
      )}
    </div>
  );
}
