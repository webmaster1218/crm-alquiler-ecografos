"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, 
  RefreshCw, 
  Truck, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  Users, 
  ArrowUpRight,
  Stethoscope,
  ChevronRight,
  ClipboardList,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { getTotalStock } from '../../lib/availability';
import { BOOKING_STATUS_CONFIG } from '../../types';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

export function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [totalStock, setTotalStock] = useState({ z6: 2, z60: 2, m7: 1, mx3: 1 });

  // Stats
  const [stats, setStats] = useState({
    activeRentals: 0,
    mrr: 0,
    totalBilledMonth: 0,
    occupancyRate: 0,
    inMaintenance: 0,
    totalClients: 0
  });

  const [equipmentDistribution, setEquipmentDistribution] = useState<any[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch inventory settings
      const stock = await getTotalStock();
      setTotalStock(stock);

      // 2. Fetch all non-cancelled bookings
      const { data: dbBookings, error } = await supabase
        .from('bookings')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;

      if (dbBookings) {
        setBookings(dbBookings);

        const active = dbBookings.filter(b => b.status === 'delivered');
        const maintenance = dbBookings.filter(b => b.status === 'maintenance');
        
        // Active MRR
        const activeMRR = active.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

        // Billed current month
        const now = new Date();
        const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const billedMonth = dbBookings
          .filter(b => b.status !== 'cancelled' && (b.start_date?.startsWith(currentMonthPrefix) || b.created_at?.startsWith(currentMonthPrefix)))
          .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

        // Occupancy calculation
        const totalMachines = (stock.z6 || 0) + (stock.z60 || 0) + (stock.m7 || 0) + (stock.mx3 || 0);
        const busyMachines = active.reduce(
          (sum, b) => sum + (b.quantity_z6 || 0) + (b.quantity_z60 || 0) + (b.quantity_m7 || 0) + (b.quantity_mx3 || 0), 
          0
        );
        const occupancy = totalMachines > 0 ? Math.min(Math.round((busyMachines / totalMachines) * 100), 100) : 0;

        // Unique clients
        const clientSet = new Set(dbBookings.map(b => b.document_number || b.client_name).filter(Boolean));

        setStats({
          activeRentals: active.length,
          mrr: activeMRR,
          totalBilledMonth: billedMonth,
          occupancyRate: occupancy,
          inMaintenance: maintenance.length,
          totalClients: clientSet.size
        });

        // Chart 1: Equipment active counts
        const z6Count = active.reduce((sum, b) => sum + (b.quantity_z6 || 0), 0);
        const z60Count = active.reduce((sum, b) => sum + (b.quantity_z60 || 0), 0);
        const m7Count = active.reduce((sum, b) => sum + (b.quantity_m7 || 0), 0);
        const mx3Count = active.reduce((sum, b) => sum + (b.quantity_mx3 || 0), 0);

        setEquipmentDistribution([
          { name: 'Mindray Z6', ocupados: z6Count, total: stock.z6 || 2 },
          { name: 'Mindray Z60', ocupados: z60Count, total: stock.z60 || 2 },
          { name: 'Mindray M7', ocupados: m7Count, total: stock.m7 || 1 },
          { name: 'Mindray MX3', ocupados: mx3Count, total: stock.mx3 || 1 },
        ]);

        // Chart 2: Status distribution
        const statusMap: Record<string, number> = {};
        dbBookings.forEach(b => {
          const s = b.status || 'pending_confirmation';
          statusMap[s] = (statusMap[s] || 0) + 1;
        });

        const statusColors: Record<string, string> = {
          delivered: '#10b981',
          confirmed: '#3b82f6',
          pending_confirmation: '#f59e0b',
          in_transit: '#6366f1',
          completed: '#64748b',
          maintenance: '#a855f7',
          cancelled: '#ef4444'
        };

        const dist = Object.keys(statusMap).map(k => ({
          name: BOOKING_STATUS_CONFIG[k]?.label || k,
          value: statusMap[k],
          color: statusColors[k] || '#94a3b8'
        }));
        setStatusDistribution(dist);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Upcoming logistics deliveries / collections
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingDeliveries = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'in_transit')
    .slice(0, 5);

  const activeRentalsList = bookings
    .filter(b => b.status === 'delivered')
    .slice(0, 5);

  if (loading) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-brand" size={32} />
        <p className="text-text-muted font-medium text-sm">Cargando métricas y flota de ecógrafos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase italic flex items-center gap-2">
            <Stethoscope className="text-brand" size={26} />
            Dashboard Operativo
          </h1>
          <p className="text-sm text-text-secondary">Monitoreo de flota de ecógrafos, ocupación en clínicas y finanzas.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/alquileres')}
            className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold hover:bg-brand/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <ClipboardList size={14} /> Gestionar Alquileres
          </button>
          <button 
            onClick={fetchDashboardData} 
            className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Recargar métricas"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Truck size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Ecógrafos en Clínica</span>
            <span className="text-2xl font-black text-text-primary block mt-0.5">{stats.activeRentals}</span>
            <span className="text-[11px] text-text-secondary">Alquileres activos</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Tasa de Ocupación</span>
            <span className="text-2xl font-black text-text-primary block mt-0.5">{stats.occupancyRate}%</span>
            <span className="text-[11px] text-text-secondary">De flota total disponible</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <DollarSign size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Ingreso Activo (MRR)</span>
            <span className="text-2xl font-black text-text-primary block mt-0.5">${stats.mrr.toLocaleString('es-CO')}</span>
            <span className="text-[11px] text-text-secondary">En contratos en curso</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Mantenimientos</span>
            <span className="text-2xl font-black text-text-primary block mt-0.5">{stats.inMaintenance}</span>
            <span className="text-[11px] text-text-secondary">Equipos en revisión</span>
          </div>
        </div>
      </div>

      {/* Gráficos de Flota y Distribución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Flota por Modelo */}
        <div className="lg:col-span-2 bg-card border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">Ocupación de Equipos por Modelo</h3>
              <p className="text-xs text-text-muted">Equipos actualmente alquilados vs Total en inventario</p>
            </div>
          </div>
          <div className="h-64 w-full min-w-0" style={{ minHeight: '256px' }}>
            <ResponsiveContainer width="100%" height={256} minWidth={0}>
              <BarChart data={equipmentDistribution} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip formatter={(value, name) => [value, name === 'ocupados' ? 'Alquilados' : 'Flota Total']} />
                <Bar dataKey="total" fill="#94a3b8" radius={[6, 6, 0, 0]} name="Flota Total" />
                <Bar dataKey="ocupados" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Alquilados" />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Distribución de Estados */}
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-1">Estado de Reservas</h3>
            <p className="text-xs text-text-muted mb-4">Distribución porcentual del histórico de alquileres</p>
          </div>

          <div className="h-48 w-full min-w-0 flex items-center justify-center" style={{ minHeight: '192px' }}>
            <ResponsiveContainer width="100%" height={192} minWidth={0}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>


          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            {statusDistribution.slice(0, 4).map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }}></div>
                <span className="text-[11px] font-semibold text-text-secondary truncate">{s.name}: {s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tablas Operativas: Próximas Entregas & Alquileres en Curso */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Próximas Entregas */}
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-blue-500" /> Próximas Entregas / Despachos
            </h3>
            <button
              onClick={() => router.push('/calendario')}
              className="text-xs font-bold text-brand hover:underline cursor-pointer"
            >
              Ver Calendario
            </button>
          </div>

          <div className="space-y-3">
            {upcomingDeliveries.length === 0 ? (
              <p className="text-xs text-text-muted italic py-4 text-center">No hay entregas pendientes en tránsito.</p>
            ) : (
              upcomingDeliveries.map(item => (
                <div 
                  key={item.id}
                  onClick={() => router.push('/alquileres')}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 hover:border-brand/40 transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-text-primary block">{item.client_name}</span>
                    <span className="text-[11px] text-text-muted">{item.start_date} • {item.client_address || 'Medellín'}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-brand">${(Number(item.total_price) || 0).toLocaleString('es-CO')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Alquileres Activos en Clínica */}
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" /> Equipos Activos en Clínica
            </h3>
            <button
              onClick={() => router.push('/alquileres')}
              className="text-xs font-bold text-brand hover:underline cursor-pointer"
            >
              Ver Todos
            </button>
          </div>

          <div className="space-y-3">
            {activeRentalsList.length === 0 ? (
              <p className="text-xs text-text-muted italic py-4 text-center">No hay ecógrafos entregados en este momento.</p>
            ) : (
              activeRentalsList.map(item => (
                <div 
                  key={item.id}
                  onClick={() => router.push('/alquileres')}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 hover:border-brand/40 transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-text-primary block">{item.client_name}</span>
                    <span className="text-[11px] text-text-muted">Hasta {item.end_date} • Dir: {item.client_address || 'Medellín'}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                    ACTIVO
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
