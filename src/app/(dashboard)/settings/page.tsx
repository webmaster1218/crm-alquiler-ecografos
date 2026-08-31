"use client";

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { Avatar } from '../../../components/shared/Avatar';
import { Button } from '../../../components/shared/Button';
import { User as UserIcon, Settings as SettingsIcon, Box, Activity, ShieldAlert } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const [subTab, setSubTab] = useState<'profile' | 'inventory'>('profile');
  const [loading, setLoading] = useState(false);

  // Inventory Stock settings
  const [stock, setStock] = useState({
    z6: 2,
    z60: 2,
    m7: 1,
    mx3: 1
  });

  const fetchInventorySettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment_settings')
        .select('value')
        .eq('key', 'inventory')
        .single();

      if (error) throw error;
      if (data && data.value) {
        setStock({
          z6: Number(data.value.z6) || 0,
          z60: Number(data.value.z60) || 0,
          m7: Number(data.value.m7) || 0,
          mx3: Number(data.value.mx3) || 0
        });
      }
    } catch (err) {
      console.error('Error fetching inventory settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'inventory') {
      fetchInventorySettings();
    }
  }, [subTab]);

  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('equipment_settings')
        .upsert({
          key: 'inventory',
          value: {
            z6: Number(stock.z6),
            z60: Number(stock.z60),
            m7: Number(stock.m7),
            mx3: Number(stock.mx3)
          }
        }, { onConflict: 'key' });

      if (error) throw error;

      Swal.fire({
        title: 'Inventario Actualizado',
        text: 'Los stocks totales de ecógrafos se han guardado correctamente en Supabase.',
        icon: 'success',
        confirmButtonColor: '#3b82f6'
      });
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'No se pudo guardar el inventario.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight uppercase italic">Configuración</h1>
          <p className="text-text-secondary text-xs mt-1">Administra tu perfil, el stock total de ecógrafos y preferencias del sistema.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100/50 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setSubTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'profile'
                ? 'bg-brand/10 text-brand shadow-sm border border-brand/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <UserIcon size={12} />
            <span>Mi Perfil</span>
          </button>
          
          <button
            onClick={() => setSubTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'inventory'
                ? 'bg-brand/10 text-brand shadow-sm border border-brand/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Box size={12} />
            <span>Inventario Total</span>
          </button>
        </div>
      </div>

      {/* RENDER PROFILE SUBTAB */}
      {subTab === 'profile' && (
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-8 pb-8 border-b border-slate-200/60 dark:border-slate-800">
            <Avatar name={state.currentUser?.name || ''} size="xl" className="shadow-2xl ring-4 ring-brand/10" />
            <div className="text-center md:text-left flex-1 space-y-1">
               <h2 className="text-xl font-black text-text-primary italic tracking-tighter uppercase">{state.currentUser?.name}</h2>
               <p className="text-brand font-black text-xs uppercase tracking-widest">{state.currentUser?.role}</p>
               <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                     <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none">Email</p>
                     <p className="text-xs font-bold text-text-primary mt-1">{state.currentUser?.email}</p>
                  </div>
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-800">
                     <p className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none">Estado</p>
                     <div className="flex items-center gap-2 mt-1.5">
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                       <p className="text-xs font-bold text-text-primary leading-none">{state.currentUser?.status}</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-l-2 border-brand pl-3">Preferencias de Sistema</h3>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                   <div>
                      <p className="text-sm font-bold text-text-primary tracking-tight uppercase">Modo Oscuro</p>
                      <p className="text-[10px] font-bold text-text-muted uppercase mt-0.5">Activa la interfaz de alto contraste</p>
                   </div>
                   <button 
                     onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
                     className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${state.darkMode ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state.darkMode ? 'left-7' : 'left-1'}`}></div>
                   </button>
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] border-l-2 border-brand pl-3">Sesión</h3>
                <Button variant="danger" className="w-full justify-start h-14 px-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest">
                   Cerrar todas las sesiones
                </Button>
             </div>
          </div>
        </div>
      )}

      {/* RENDER INVENTORY SUBTAB */}
      {subTab === 'inventory' && (
        <form onSubmit={handleSaveInventory} className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
              <Box size={18} className="text-brand" />
              <span>Inventario Global de Ecógrafos</span>
            </h2>
            <p className="text-xs text-text-secondary mt-1">Configura la cantidad total de máquinas físicas en tu stock. Estos números limitarán el máximo disponible para alquiler en las mismas fechas.</p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Stock Mindray Z6</label>
                <input
                  type="number"
                  required
                  value={stock.z6}
                  onChange={e => setStock(prev => ({ ...prev, z6: Number(e.target.value) }))}
                  className="w-full text-xs font-bold text-text-primary bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Stock Mindray Z60</label>
                <input
                  type="number"
                  required
                  value={stock.z60}
                  onChange={e => setStock(prev => ({ ...prev, z60: Number(e.target.value) }))}
                  className="w-full text-xs font-bold text-text-primary bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Stock Mindray M7</label>
                <input
                  type="number"
                  required
                  value={stock.m7}
                  onChange={e => setStock(prev => ({ ...prev, m7: Number(e.target.value) }))}
                  className="w-full text-xs font-bold text-text-primary bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-brand"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Stock Mindray MX3</label>
                <input
                  type="number"
                  required
                  value={stock.mx3}
                  onChange={e => setStock(prev => ({ ...prev, mx3: Number(e.target.value) }))}
                  className="w-full text-xs font-bold text-text-primary bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" variant="primary" className="h-11 px-8 font-black uppercase text-xs tracking-wider" disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar Inventario'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
