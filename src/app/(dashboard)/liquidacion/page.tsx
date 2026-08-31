"use client";

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, DollarSign, ArrowUpRight, TrendingUp, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { exportToExcel } from '../../../utils/exportUtils';
import { Badge } from '../../../components/shared/Badge';
import Swal from 'sweetalert2';

export default function LiquidacionPage() {
  const [rentals, setRentals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBilled: 0,
    outstanding: 0,
    collected: 0,
    depositGuarantees: 0
  });

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
        
        let billed = 0;
        let pending = 0;
        let paid = 0;

        data.forEach(b => {
          const total = Number(b.total_price) || 0;
          billed += total;
          
          // If booking status is completed or has receipt url, consider paid
          if (b.status === 'completed' || b.payment_receipt_url) {
            paid += total;
          } else {
            pending += total;
          }
        });

        setStats({
          totalBilled: billed,
          outstanding: pending,
          collected: paid,
          depositGuarantees: data.filter(b => b.status === 'delivered').length * 200000 // Mock guarantee deposit ($200k COP per active machine)
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudieron cargar los datos de facturación.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleExport = () => {
    const headers = ['Factura ID', 'Cliente', 'Equipos', 'F. Inicio', 'F. Fin', 'Total Facturado', 'Soporte Pago', 'Estado Financiero'];
    const rows = rentals.map(r => ({
      'Factura ID': `FAC-${r.id}`,
      'Cliente': r.client_name,
      'Equipos': `${r.quantity_z6 > 0 ? `${r.quantity_z6}x Z6 ` : ''}${r.quantity_z60 > 0 ? `${r.quantity_z60}x Z60 ` : ''}${r.quantity_m7 > 0 ? `${r.quantity_m7}x M7 ` : ''}${r.quantity_mx3 > 0 ? `${r.quantity_mx3}x MX3 ` : ''}`,
      'F. Inicio': r.start_date,
      'F. Fin': r.end_date,
      'Total Facturado': `$${(Number(r.total_price) || 0).toLocaleString('es-CO')}`,
      'Soporte Pago': r.payment_receipt_url ? 'Cargado' : 'Pendiente',
      'Estado Financiero': r.status === 'completed' || r.payment_receipt_url ? 'PAGADO' : 'PENDIENTE COBRO'
    }));

    exportToExcel(headers, rows, 'Liquidacion_Finanzas_Ecografos');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase italic flex items-center gap-2">
            <DollarSign className="text-brand shrink-0" size={24} />
            Liquidación Financiera
          </h1>
          <p className="text-sm text-text-secondary">Conciliación de depósitos, saldos de alquileres y comprobantes de abonos.</p>
        </div>
        <button 
          onClick={handleExport}
          className="px-4 py-2 bg-brand text-white font-black hover:bg-brand/80 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
        >
          <FileSpreadsheet size={14} /> Exportar Conciliación
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <ArrowUpRight size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Total Facturado</span>
            <span className="text-xl font-black text-text-primary block mt-0.5">${stats.totalBilled.toLocaleString('es-CO')}</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Total Recaudado</span>
            <span className="text-xl font-black text-text-primary block mt-0.5">${stats.collected.toLocaleString('es-CO')}</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Cuentas por Cobrar</span>
            <span className="text-xl font-black text-text-primary block mt-0.5">${stats.outstanding.toLocaleString('es-CO')}</span>
          </div>
        </div>

        <div className="bg-card border border-slate-200/60 dark:border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block">Fondos de Garantía</span>
            <span className="text-xl font-black text-white block mt-0.5">${stats.depositGuarantees.toLocaleString('es-CO')}</span>
          </div>
        </div>
      </div>

      {/* Billing Records Table */}
      <div className="bg-card border border-white/10 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-sm font-black text-white uppercase tracking-wider">Reporte de Caja y Saldos</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
            </div>
          ) : rentals.length === 0 ? (
            <p className="p-12 text-center text-xs text-white/40 italic">No hay registros financieros.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-white/40 text-[9px] font-black uppercase tracking-wider">
                  <th className="px-6 py-4">Factura/Alquiler</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Valor Alquiler</th>
                  <th className="px-6 py-4">Comprobante</th>
                  <th className="px-6 py-4">Estado Financiero</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white/70">
                {rentals.map((r) => {
                  const isPaid = r.status === 'completed' || !!r.payment_receipt_url;
                  
                  return (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">FAC-{r.id}</td>
                      <td className="px-6 py-4 font-semibold">{r.client_name || 'Bloqueo Técnico'}</td>
                      <td className="px-6 py-4 font-mono font-bold text-white">${(Number(r.total_price) || 0).toLocaleString('es-CO')}</td>
                      <td className="px-6 py-4">
                        {r.payment_receipt_url ? (
                          <a 
                            href={r.payment_receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-brand font-black hover:underline flex items-center gap-1.5"
                          >
                            <FileText size={12} /> Ver Soporte
                          </a>
                        ) : (
                          <span className="text-white/30 italic">Sin comprobante</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isPaid ? (
                          <Badge variant="success">PAGADO</Badge>
                        ) : (
                          <Badge variant="danger">PENDIENTE COBRO</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
