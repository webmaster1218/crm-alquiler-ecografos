"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  ClipboardList,
  ArrowLeft,
  RefreshCw,
  User,
  Eye,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { Button } from '../shared/Button';
import { Badge } from '../shared/Badge';
import { Avatar } from '../shared/Avatar';
import { supabase } from '../../lib/supabaseClient';
import { exportToExcel } from '../../utils/exportUtils';
import Swal from 'sweetalert2';

export function ContactList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdFromUrl = searchParams.get('id');

  const [bookings, setBookings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Single Client view details
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Group bookings into unique clients in memory
  const processClients = (allBookings: any[]) => {
    const clientsMap: Record<string, any> = {};

    allBookings.forEach(b => {
      // Use document number or name as unique key
      const key = b.document_number || b.client_name || 'Desconocido';
      
      if (!clientsMap[key]) {
        clientsMap[key] = {
          cliente_id: key,
          nombre: b.client_name || 'Desconocido',
          email: b.client_email,
          telefono: b.client_phone,
          direccion: b.client_address,
          identificacion: b.document_number || '—',
          tax_id: b.tax_id || '—',
          client_type: b.client_type || 'medico',
          bookings: []
        };
      }
      clientsMap[key].bookings.push(b);
    });

    const clientsList = Object.values(clientsMap).sort((a, b) => a.nombre.localeCompare(b.nombre));
    setClients(clientsList);

    // If client ID is currently in URL, select it
    if (clientIdFromUrl) {
      const found = clientsList.find(c => c.cliente_id === clientIdFromUrl);
      if (found) setSelectedClient(found);
    }
  };

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
        processClients(data);
      }
    } catch (err) {
      console.error('Error fetching bookings for contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    if (clientIdFromUrl && clients.length > 0) {
      const found = clients.find(c => c.cliente_id === clientIdFromUrl);
      if (found) {
        setSelectedClient(found);
      } else {
        setSelectedClient(null);
      }
    } else if (!clientIdFromUrl) {
      setSelectedClient(null);
    }
  }, [clientIdFromUrl, clients]);

  const filteredClients = clients.filter(c => 
    String(c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.telefono || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.identificacion || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    const headers = ['Nombre', 'Identificación (CC/NIT)', 'RUT (DV)', 'Tipo', 'Celular', 'Email', 'Dirección', 'Alquileres Realizados'];
    const rows = filteredClients.map(c => ({
      'Nombre': c.nombre,
      'Identificación (CC/NIT)': c.identificacion,
      'RUT (DV)': c.tax_id,
      'Tipo': c.client_type === 'medico' ? 'Médico' : 'Clínica/Institución',
      'Celular': c.telefono,
      'Email': c.email,
      'Dirección': c.direccion,
      'Alquileres Realizados': c.bookings.length
    }));
    exportToExcel(headers, rows, 'Clientes_Alquiler_Ecografos');
  };

  // Compile all notes from all bookings of this client
  const getCompiledNotes = (client: any) => {
    const allNotes: any[] = [];
    client.bookings.forEach((b: any) => {
      if (b.notes && b.notes.startsWith('[')) {
        try {
          const parsed = JSON.parse(b.notes);
          parsed.forEach((note: any) => {
            allNotes.push({
              ...note,
              bookingId: b.id,
              bookingRange: `${b.start_date} al ${b.end_date}`
            });
          });
        } catch (e) {}
      } else if (b.notes) {
        allNotes.push({
          date: b.start_date,
          text: b.notes,
          user: 'Historial',
          bookingId: b.id,
          bookingRange: `${b.start_date} al ${b.end_date}`
        });
      }
    });
    return allNotes.sort((a, b) => b.date.localeCompare(a.date));
  };

  if (selectedClient) {
    const totalSpent = selectedClient.bookings?.reduce((sum: number, b: any) => sum + (Number(b.total_price) || 0), 0) || 0;
    const clientNotes = getCompiledNotes(selectedClient);

    return (
      <div className="w-full animate-in fade-in duration-300">
        
        {/* HERO HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl mt-2 mb-5 shadow-2xl border border-white/5">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-brand/8 blur-3xl pointer-events-none" />

          <div className="relative px-6 md:px-8 pt-6 pb-6">
            <button
              onClick={() => {
                setSelectedClient(null);
                router.push('/contacts');
              }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white/70 transition-colors mb-5"
            >
              <ArrowLeft size={12} />
              <span>Volver a Clientes</span>
            </button>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-xl border border-white/10 shrink-0">
                  {String(selectedClient.nombre || 'C').charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border border-brand/30 bg-brand/20 text-white">
                      {selectedClient.client_type === 'medico' ? 'Médico' : 'Clínica'}
                    </span>
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-white leading-none">
                    {selectedClient.nombre}
                  </h1>
                  <p className="text-white/40 text-[10px] font-mono font-medium">
                    Doc: {selectedClient.identificacion}
                  </p>
                </div>
              </div>

              <div className="md:text-right shrink-0">
                <p className="text-[9px] font-black text-white/25 uppercase tracking-widest mb-0.5">Total Facturado</p>
                <p className="text-3xl font-black text-white">${totalSpent.toLocaleString('es-CO')}</p>
                <p className="text-[10px] text-white/45 font-bold uppercase mt-0.5">{selectedClient.bookings?.length || 0} reserva(s) lograda(s)</p>
              </div>
            </div>
          </div>
        </div>

        {/* BODY SPLIT */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 pb-10">
          {/* LEFT: Client Info */}
          <div className="xl:col-span-2 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/10 bg-white/5">
                <User size={14} className="text-brand" />
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Información de Hoja de Vida</span>
              </div>
              <div className="px-5 py-4 space-y-3.5 text-xs font-medium text-white/70">
                <div>
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Identificación CC/NIT</span>
                  <span className="text-white font-bold text-sm">{selectedClient.identificacion}</span>
                </div>
                {selectedClient.tax_id && (
                  <div>
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">RUT Tributario</span>
                    <span className="text-white font-bold">{selectedClient.tax_id}</span>
                  </div>
                )}
                <div>
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Teléfono / Celular</span>
                  <span className="text-white font-bold flex items-center gap-1.5 mt-1">
                    <Phone size={12} className="text-white/40 shrink-0" />
                    {selectedClient.telefono || 'Sin teléfono'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Email</span>
                  <span className="text-white font-bold flex items-center gap-1.5 mt-1">
                    <Mail size={12} className="text-white/40 shrink-0" />
                    {selectedClient.email || 'Sin correo registrado'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block">Dirección de Operación</span>
                  <span className="text-white font-bold flex items-center gap-1.5 mt-1">
                    <MapPin size={12} className="text-white/40 shrink-0" />
                    {selectedClient.direccion || 'Sin dirección registrada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Compiled Notes Timeline */}
            <div className="rounded-2xl border border-white/10 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/10 bg-white/5">
                <FileText size={14} className="text-brand" />
                <span className="text-[11px] font-black text-white uppercase tracking-widest">Historial de Comentarios</span>
              </div>
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                {clientNotes.length === 0 ? (
                  <p className="text-xs text-white/30 text-center py-4">No hay notas registradas para este cliente.</p>
                ) : (
                  clientNotes.map((note, index) => (
                    <div key={index} className="bg-white/5 p-3 rounded-lg border border-white/5 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-brand uppercase tracking-wider text-[9px]">{note.user}</span>
                        <span className="text-white/40 text-[9px]">{note.date}</span>
                      </div>
                      <p className="text-white/80">{note.text}</p>
                      <div className="mt-1 text-[9px] text-white/30 font-medium">Alquiler del {note.bookingRange}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Rentals History */}
          <div className="xl:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2">
                  <ClipboardList size={14} className="text-brand" />
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">Alquileres Contratados</span>
                </div>
                <span className="bg-brand/10 text-brand text-[9px] px-2 py-0.5 rounded-full font-black">
                  {selectedClient.bookings?.length || 0}
                </span>
              </div>
              <div className="divide-y divide-white/5">
                {selectedClient.bookings.map((booking: any) => {
                  const hasContract = !!booking.signed_contract_url;
                  
                  return (
                    <div key={booking.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                      <div>
                        <p className="text-xs font-black text-white">
                          Alquiler #{booking.id}
                        </p>
                        <p className="text-[10px] text-white/40 font-semibold mt-0.5">
                          {booking.start_date} al {booking.end_date}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          {hasContract ? (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black uppercase">Contrato Cargado</span>
                          ) : (
                            <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black uppercase">Falta Contrato</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs font-black text-white">
                            ${(Number(booking.total_price) || 0).toLocaleString('es-CO')}
                          </p>
                          <span className={`inline-block text-[9px] font-bold mt-0.5 uppercase ${
                            booking.status === 'delivered' ? 'text-emerald-400' : 'text-amber-500'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
            Clientes
          </h1>
          <p className="text-white/50 text-xs mt-1">Gestión de médicos y clínicas que alquilan ecógrafos.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={fetchBookings} 
            disabled={loading}
            className="flex items-center gap-2 border-white/10 text-white/70 hover:text-white bg-white/5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Sincronizar</span>
          </Button>
          <Button 
            onClick={handleExport}
            variant="primary" 
            className="flex items-center gap-2"
          >
            <FileSpreadsheet size={14} /> Exportar Listado
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-card p-3 rounded-2xl border border-white/10 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-brand"
            placeholder="Buscar por médico, clínica, NIT o celular..."
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-card rounded-2xl border border-white/10 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="animate-spin text-brand" size={28} />
            <p className="text-white/40 font-medium text-sm">Procesando hojas de vida...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <User className="text-white/20" size={40} />
            <p className="text-white/40 font-black text-sm uppercase tracking-wider">No se encontraron clientes registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-white/40 text-[9px] font-black uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">CC/NIT</th>
                  <th className="px-6 py-4">Celular / Email</th>
                  <th className="px-6 py-4">Alquileres</th>
                  <th className="px-6 py-4 text-right">Ver Hoja de Vida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.map((client) => (
                  <tr 
                    key={client.cliente_id} 
                    onClick={() => router.push(`/contacts?id=${encodeURIComponent(client.cliente_id)}`)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={client.nombre || 'Cliente'} />
                        <div>
                          <span className="text-xs font-black text-white block">{client.nombre}</span>
                          <span className="text-[10px] text-brand font-semibold capitalize">{client.client_type === 'medico' ? 'Médico' : 'Clínica'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold text-white/60">
                      {client.identificacion || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{client.telefono || '—'}</span>
                        {client.email && <span className="text-[10px] text-white/40">{client.email}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-brand/10 text-brand text-[10px] px-2 py-0.5 rounded-full font-bold border border-brand/20">
                        {client.bookings.length} Alquileres
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/contacts?id=${encodeURIComponent(client.cliente_id)}`);
                        }}
                        className="p-1.5 rounded-lg text-white/40 hover:text-brand hover:bg-brand/10 transition-colors"
                      >
                        <Eye size={14} className="transform group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-[10px] font-bold text-white/40 text-right">
        {filteredClients.length} de {clients.length} clientes procesados
      </div>
    </div>
  );
}
