"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, PieChart as PieIcon, Package, Activity, Bell, BarChart2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import RentalAlertsSettings from '../../../components/reports/RentalAlertsSettings';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'stats'>('alerts');
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [modelShares, setModelShares] = useState<any[]>([]);

  const COLORS = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b'];

  const calculateReportData = (data: any[]) => {
    // 1. Profitability per Model
    let z6Income = 0;
    let z60Income = 0;
    let m7Income = 0;
    let mx3Income = 0;

    data.forEach(b => {
      const price = Number(b.total_price) || 0;
      const totalUnits = (b.quantity_z6 || 0) + (b.quantity_z60 || 0) + (b.quantity_m7 || 0) + (b.quantity_mx3 || 0);
      if (totalUnits > 0) {
        z6Income += (b.quantity_z6 / totalUnits) * price;
        z60Income += (b.quantity_z60 / totalUnits) * price;
        m7Income += (b.quantity_m7 / totalUnits) * price;
        mx3Income += (b.quantity_mx3 / totalUnits) * price;
      }
    });

    setModelShares([
      { name: 'Mindray Z6', value: Math.round(z6Income) },
      { name: 'Mindray Z60', value: Math.round(z60Income) },
      { name: 'Mindray M7', value: Math.round(m7Income) },
      { name: 'Mindray MX3', value: Math.round(mx3Income) }
    ]);

    // 2. Simplified monthly revenues
    const monthlyIncome: Record<string, number> = {};
    data.forEach(b => {
      if (b.start_date) {
        const month = b.start_date.substring(0, 7); // YYYY-MM
        monthlyIncome[month] = (monthlyIncome[month] || 0) + (Number(b.total_price) || 0);
      }
    });

    const formattedRevenue = Object.entries(monthlyIncome)
      .map(([month, value]) => ({ month, Ingresos: value }))
      .sort((a, b) => a.month.localeCompare(b.month));

    setRevenueData(formattedRevenue);
  };

  useEffect(() => {
    const fetchFinanceData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .neq('status', 'cancelled');

        if (error) throw error;
        if (data) {
          setRentals(data);
          calculateReportData(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinanceData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header con selector de pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase italic flex items-center gap-2">
            <BarChart3 className="text-brand shrink-0" size={24} />
            Reportes
          </h1>
          <p className="text-xs text-text-secondary">
            {activeTab === 'alerts'
              ? 'Configuración de alertas automáticas por WhatsApp para nuevos alquileres.'
              : 'Métricas clave de rendimiento, rentabilidad y ocupación histórica.'}
          </p>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'alerts'
                ? 'bg-white dark:bg-slate-800 text-brand shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Bell size={14} className={activeTab === 'alerts' ? 'text-emerald-500' : ''} />
            Reportes al Alquilar
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stats'
                ? 'bg-white dark:bg-slate-800 text-brand shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <BarChart2 size={14} />
            Estadísticas y Finanzas
          </button>
        </div>
      </div>

      {/* Contenido Pestaña 1: Reportes al Alquilar */}
      {activeTab === 'alerts' && (
        <RentalAlertsSettings />
      )}

      {/* Contenido Pestaña 2: Estadísticas y Finanzas */}
      {activeTab === 'stats' && (
        loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue chart */}
            <div className="lg:col-span-2 bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Activity className="text-brand" size={14} /> Historial de Ingresos Mensuales
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-[0.05]" />
                    <XAxis dataKey="month" stroke="currentColor" className="opacity-50" fontSize={10} />
                    <YAxis stroke="currentColor" className="opacity-50" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-bg-card, #1e293b)', border: '1px solid var(--color-border, rgba(255,255,255,0.1))', borderRadius: '8px' }}
                      labelStyle={{ color: 'var(--color-text-primary, white)' }}
                    />
                    <Bar dataKey="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Rentability Share */}
            <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <PieIcon className="text-emerald-400" size={14} /> Rentabilidad por Modelo
              </h3>
              <div className="h-[220px] w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelShares}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {modelShares.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => `$${Number(value).toLocaleString('es-CO')}`}
                      contentStyle={{ backgroundColor: 'var(--color-bg-card, #1e293b)', border: '1px solid var(--color-border, rgba(255,255,255,0.1))', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pt-2">
                {modelShares.map((m, idx) => (
                  <div key={m.name} className="flex items-center gap-2 text-[10px] font-bold text-text-secondary">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="truncate">{m.name}: <span className="font-mono text-text-primary">${m.value.toLocaleString('es-CO')}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
