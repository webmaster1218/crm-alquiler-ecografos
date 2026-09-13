"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DollarSign,
  Calendar,
  Layers,
  Filter,
  RefreshCw,
  FileText,
  Search,
  Download,
  ChevronDown,
  FileSpreadsheet,
  CalendarRange,
  Clock,
  TrendingUp,
  Percent,
  CheckCircle2,
  ArrowLeftRight
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { exportLiquidacionExcel, LiquidacionRentalItem } from '../../../utils/exportUtils';
import Swal from 'sweetalert2';
import { cn } from '../../../types';

const MESES = [
  { id: 'all', label: 'Todos los Meses' },
  { id: '2', label: 'Febrero' },
  { id: '3', label: 'Marzo' },
  { id: '4', label: 'Abril' },
  { id: '5', label: 'Mayo' },
  { id: '6', label: 'Junio' },
  { id: '7', label: 'Julio' },
  { id: '8', label: 'Agosto' },
  { id: '9', label: 'Septiembre' },
  { id: '10', label: 'Octubre' },
  { id: '11', label: 'Noviembre' },
  { id: '12', label: 'Diciembre' },
];

export default function LiquidacionPage() {
  const [rentals, setRentals] = useState<LiquidacionRentalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Dropdown de exportación
  const [exportOpen, setExportOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      let { data, error } = await supabase
        .from('alquileres')
        .select('*')
        .filter('estado', 'not.in', '(cancelado,cancelled)')
        .order('fecha_inicio', { ascending: false });

      if (error) {
        const fb = await supabase
          .from('bookings')
          .select('*')
          .filter('status', 'not.in', '(cancelled,cancelado)')
          .order('start_date', { ascending: false });
        data = fb.data;
        error = fb.error;
      }

      if (error) throw error;
      if (data) setRentals(data);
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron cargar los datos de liquidación.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  // Filtrado de alquileres
  const filteredRentals = useMemo(() => {
    return rentals.filter(r => {
      const fInicio = r.fecha_inicio || r.start_date || '';
      const fFin = r.fecha_fin || r.end_date || fInicio;
      const cliente = (r.nombre_cliente || r.client_name || '').toLowerCase();

      if (searchQuery && !cliente.includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (selectedMonth !== 'all' && fInicio) {
        const parts = fInicio.split('-');
        if (parts.length >= 2) {
          const m = parseInt(parts[1], 10);
          if (m !== parseInt(selectedMonth, 10)) return false;
        }
      }

      if (startDate && fFin < startDate) return false;
      if (endDate && fInicio > endDate) return false;

      return true;
    });
  }, [rentals, selectedMonth, startDate, endDate, searchQuery]);

  // Totales
  const stats = useMemo(() => {
    let totalFacturado = 0;
    let totalDomicilio = 0;
    let totalNeto = 0;
    let totalMauricio = 0;
    let totalWinners = 0;

    filteredRentals.forEach(r => {
      const total = Number(r.precio_total || r.total_price || 0);
      const domicilio = typeof r.domicilio === 'number' ? r.domicilio : 70000;
      const neto = Math.max(0, total - domicilio);
      const mauricio = Math.round(neto * 0.40);
      const winners = Math.round(neto * 0.60);

      totalFacturado += total;
      totalDomicilio += domicilio;
      totalNeto += neto;
      totalMauricio += mauricio;
      totalWinners += winners;
    });

    return {
      totalFacturado,
      totalDomicilio,
      totalNeto,
      totalMauricio,
      totalWinners,
      count: filteredRentals.length
    };
  }, [filteredRentals]);

  // Exportar por Rango (o selección actual)
  const handleExportRange = async () => {
    setExportOpen(false);

    if (!startDate && !endDate && selectedMonth === 'all') {
      const isDark = document.documentElement.classList.contains('dark');
      const { value: formValues } = await Swal.fire({
        title: 'Exportar por Rango de Fechas',
        html: `
          <div class="flex flex-col gap-3 text-left">
            <p class="text-[10px] font-black text-text-muted uppercase tracking-wider mb-1">
              Selecciona el período de alquileres a exportar:
            </p>
            <div>
              <label class="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Fecha Desde:</label>
              <input id="swal-range-from" type="date" class="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-text-primary focus:outline-none focus:ring-2 focus:ring-brand">
            </div>
            <div>
              <label class="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">Fecha Hasta:</label>
              <input id="swal-range-to" type="date" class="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-text-primary focus:outline-none focus:ring-2 focus:ring-brand">
            </div>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Exportar Excel',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#374151',
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
        customClass: {
          popup: 'rounded-[24px] border border-slate-200 dark:border-slate-800'
        },
        preConfirm: () => {
          return {
            dateFrom: (document.getElementById('swal-range-from') as HTMLInputElement).value,
            dateTo: (document.getElementById('swal-range-to') as HTMLInputElement).value
          };
        }
      });

      if (!formValues) return;

      const from = formValues.dateFrom;
      const to = formValues.dateTo;

      let rFiltered = rentals;
      if (from) rFiltered = rFiltered.filter(r => (r.fecha_fin || r.end_date || r.fecha_inicio || '') >= from);
      if (to) rFiltered = rFiltered.filter(r => (r.fecha_inicio || r.start_date || '') <= to);

      if (rFiltered.length === 0) {
        Swal.fire('Atención', 'No hay registros en el rango especificado.', 'warning');
        return;
      }

      const outName = from && to ? `LIQUIDACION_ECOGRAFOS_${from}_AL_${to}` : 'LIQUIDACION_ECOGRAFOS_RANGO';
      exportLiquidacionExcel(rFiltered, {
        separateMonths: false,
        filename: outName,
        dateRange: from || to ? { start: from, end: to } : undefined
      });
      return;
    }

    if (filteredRentals.length === 0) {
      Swal.fire('Atención', 'No hay registros para exportar en el rango actual.', 'warning');
      return;
    }

    let outName = 'LIQUIDACION_ECOGRAFOS_RANGO';
    if (startDate && endDate) {
      outName = `LIQUIDACION_ECOGRAFOS_${startDate}_AL_${endDate}`;
    } else if (selectedMonth !== 'all') {
      const mName = MESES.find(m => m.id === selectedMonth)?.label || 'MES';
      outName = `LIQUIDACION_ECOGRAFOS_${mName.toUpperCase()}`;
    }

    exportLiquidacionExcel(filteredRentals, {
      separateMonths: false,
      filename: outName,
      dateRange: startDate || endDate ? { start: startDate, end: endDate } : undefined
    });
  };

  // Exportar General (Multi-Mes Completo)
  const handleExportFull = () => {
    setExportOpen(false);
    if (rentals.length === 0) {
      Swal.fire('Atención', 'No hay registros para exportar.', 'warning');
      return;
    }

    exportLiquidacionExcel(rentals, {
      separateMonths: true,
      filename: `LIQUIDACION_ALQUILER_DE_ECOGRAFOS_${new Date().getFullYear()}`
    });
  };

  const handleClearFilters = () => {
    setSelectedMonth('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Top Header - Totalmente Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight uppercase italic flex items-center gap-2">
            <DollarSign className="text-brand shrink-0" size={22} />
            Liquidación Financiera
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Control de ingresos, domicilios y comisiones de socios.
          </p>
        </div>

        {/* Botón único de exportación con dropdown + Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div ref={exportDropdownRef} className="relative flex-1 sm:flex-none">
            <button
              onClick={() => setExportOpen(o => !o)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold px-3.5 sm:px-4 py-2 rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition-all select-none cursor-pointer"
            >
              <Download size={13} />
              <span>Exportar</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-32px)] bg-card border border-slate-200/60 dark:border-slate-700/80 rounded-xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Opciones de Liquidación</p>
                </div>

                <button
                  onClick={handleExportRange}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-text-primary transition-colors text-left group cursor-pointer"
                >
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors shrink-0">
                    <CalendarRange size={13} />
                  </div>
                  <div>
                    <p className="font-black text-text-primary">Por Rango de Fechas</p>
                    <p className="text-[9px] text-text-muted">
                      {startDate || endDate || selectedMonth !== 'all' ? 'Filtro actual en pantalla' : 'Elegir rango personalizado'}
                    </p>
                  </div>
                </button>

                <button
                  onClick={handleExportFull}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-text-primary transition-colors text-left group cursor-pointer"
                >
                  <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-colors shrink-0">
                    <FileSpreadsheet size={13} />
                  </div>
                  <div>
                    <p className="font-black text-text-primary">General (Multi-Mes)</p>
                    <p className="text-[9px] text-text-muted">Pestañas por mes + Consolidado</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={fetchFinanceData}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0"
            title="Actualizar datos"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid Adaptable (1 en mobile muy chico, 2 en sm, 3 en md, 5 en xl) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Total Facturado */}
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-3.5 sm:p-4 md:p-5 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <DollarSign size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-wider block truncate">Valor Total</span>
            <span className="text-base sm:text-lg md:text-xl font-black text-text-primary block mt-0.5 truncate">${stats.totalFacturado.toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* Domicilios */}
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-3.5 sm:p-4 md:p-5 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-wider block truncate">Domicilios</span>
            <span className="text-base sm:text-lg md:text-xl font-black text-amber-500 block mt-0.5 truncate">${stats.totalDomicilio.toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* Valor Neto */}
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-3.5 sm:p-4 md:p-5 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-wider block truncate">Valor Neto</span>
            <span className="text-base sm:text-lg md:text-xl font-black text-emerald-500 block mt-0.5 truncate">${stats.totalNeto.toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* 40% Mauricio */}
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-3.5 sm:p-4 md:p-5 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Percent size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-wider block truncate">40% Dr. Mauricio</span>
            <span className="text-base sm:text-lg md:text-xl font-black text-indigo-400 block mt-0.5 truncate">${stats.totalMauricio.toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* 60% Winners - En mobile chico ocupa 2 columnas para no desbalancear */}
        <div className="col-span-2 sm:col-span-1 md:col-span-1 bg-card border border-slate-200/60 dark:border-slate-800 p-3.5 sm:p-4 md:p-5 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-sm">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-wider block truncate">60% Winners</span>
            <span className="text-base sm:text-lg md:text-xl font-black text-purple-400 block mt-0.5 truncate">${stats.totalWinners.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* Filter and Table Card - Contenedor Responsive */}
      <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Barra de Filtros y Búsqueda */}
        <div className="p-3 sm:p-4 border-b border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={cn(
                "px-3 py-2 text-xs font-bold rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-none",
                showFilters || startDate || endDate || selectedMonth !== 'all'
                  ? "bg-brand/10 text-brand border-brand/30"
                  : "bg-slate-50 dark:bg-slate-900 text-text-secondary border-slate-200 dark:border-slate-800 hover:text-text-primary"
              )}
            >
              <Filter size={13} />
              <span>Rango & Fechas</span>
              {(startDate || endDate || selectedMonth !== 'all') && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand ml-0.5"></span>
              )}
            </button>

            {(startDate || endDate || selectedMonth !== 'all' || searchQuery) && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                title="Limpiar filtros"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Panel Expandible de Rango de Fechas y Mes (Responsive) */}
        {showFilters && (
          <div className="p-3.5 sm:p-4 border-b border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 animate-in fade-in duration-150">
            <div>
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Calendar size={11} /> Fecha Desde
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (selectedMonth !== 'all') setSelectedMonth('all');
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Calendar size={11} /> Fecha Hasta
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (selectedMonth !== 'all') setSelectedMonth('all');
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1 flex items-center gap-1">
                <Layers size={11} /> Filtrar Mes
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
              >
                {MESES.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Indicador sutil para móviles de scroll horizontal */}
        <div className="sm:hidden px-3 py-1.5 bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] text-text-muted text-center flex items-center justify-center gap-1.5">
          <ArrowLeftRight size={11} className="text-text-muted" />
          <span>Desliza horizontalmente para ver todas las columnas</span>
        </div>

        {/* Tabla Compacta con scroll horizontal suave */}
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-2"></div>
              <p className="text-xs text-text-muted">Cargando liquidaciones...</p>
            </div>
          ) : filteredRentals.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-xs text-text-muted italic">No se encontraron alquileres con los filtros aplicados.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/60 dark:border-slate-800 text-text-muted text-[10px] font-black uppercase tracking-wider">
                  <th className="px-3.5 py-3">Fecha Pago</th>
                  <th className="px-3.5 py-3">Fecha Alquiler</th>
                  <th className="px-3.5 py-3">Cliente</th>
                  <th className="px-3.5 py-3">Referencia</th>
                  <th className="px-3.5 py-3 text-right">Valor Total</th>
                  <th className="px-3.5 py-3 text-right">Domicilio</th>
                  <th className="px-3.5 py-3 text-right">Valor Neto</th>
                  <th className="px-3.5 py-3 text-right text-indigo-400">40% Mauricio</th>
                  <th className="px-3.5 py-3 text-right text-purple-400">60% Winners</th>
                  <th className="px-3.5 py-3 text-center">Soporte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredRentals.map((r) => {
                  const clientName = (r.nombre_cliente || r.client_name || 'CLIENTE').toUpperCase();
                  const fInicio = r.fecha_inicio || r.start_date || '';
                  const fFin = r.fecha_fin || r.end_date || '';

                  let fAlquiler = fInicio;
                  if (fInicio && fFin && fInicio !== fFin) {
                    fAlquiler = `${fInicio} — ${fFin}`;
                  }

                  const refs: string[] = [];
                  const z6 = (r.cantidad_z6 ?? r.quantity_z6 ?? 0);
                  const z60 = (r.cantidad_z60 ?? r.quantity_z60 ?? 0);
                  const m7 = (r.cantidad_m7 ?? r.quantity_m7 ?? 0);
                  const mx3 = (r.cantidad_mx3 ?? r.quantity_mx3 ?? 0);
                  if (z6 > 0) refs.push(z6 > 1 ? `${z6}x Z6` : 'Z6');
                  if (z60 > 0) refs.push(z60 > 1 ? `${z60}x Z60` : 'Z60');
                  if (m7 > 0) refs.push(m7 > 1 ? `${m7}x M7` : 'M7');
                  if (mx3 > 0) refs.push(mx3 > 1 ? `${mx3}x MX3` : 'MX3');
                  if (refs.length === 0) {
                    if ((r.notas || r.notes || '').includes('MX3')) refs.push('MX3');
                    else refs.push('Z6');
                  }
                  const refText = refs.join(', ');

                  const total = Number(r.precio_total || r.total_price || 0);
                  const dom = typeof r.domicilio === 'number' ? r.domicilio : 70000;
                  const neto = Math.max(0, total - dom);
                  const mau = Math.round(neto * 0.40);
                  const win = Math.round(neto * 0.60);
                  const receiptUrl = (r as any).payment_receipt_url || (r as any).soporte_pago_url;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-text-secondary whitespace-nowrap">
                        {r.fecha_pago || fInicio || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-text-primary whitespace-nowrap">
                        {fAlquiler}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-text-primary">
                        {clientName}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          {refText}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-text-primary whitespace-nowrap">
                        ${total.toLocaleString('es-CO')}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-amber-500 whitespace-nowrap">
                        ${dom.toLocaleString('es-CO')}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-500 whitespace-nowrap">
                        ${neto.toLocaleString('es-CO')}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-indigo-400 whitespace-nowrap">
                        ${mau.toLocaleString('es-CO')}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-purple-400 whitespace-nowrap">
                        ${win.toLocaleString('es-CO')}
                      </td>
                      <td className="px-3.5 py-2.5 text-center">
                        {receiptUrl ? (
                          <a
                            href={receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-brand font-bold hover:underline"
                          >
                            <FileText size={12} /> Ver
                          </a>
                        ) : (
                          <span className="text-[10px] text-text-muted">Eco Especializada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Fila de Totales */}
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 font-black text-xs">
                  <td colSpan={4} className="px-3.5 py-3 uppercase text-text-primary tracking-wider text-[11px]">
                    Totales ({filteredRentals.length} alquileres)
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-text-primary whitespace-nowrap">
                    ${stats.totalFacturado.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-amber-500 whitespace-nowrap">
                    ${stats.totalDomicilio.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-emerald-500 whitespace-nowrap">
                    ${stats.totalNeto.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-indigo-400 whitespace-nowrap">
                    ${stats.totalMauricio.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-purple-400 whitespace-nowrap">
                    ${stats.totalWinners.toLocaleString('es-CO')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
