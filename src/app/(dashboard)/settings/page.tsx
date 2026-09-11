"use client";

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { Avatar } from '../../../components/shared/Avatar';
import { Button } from '../../../components/shared/Button';
import { User as UserIcon, Settings as SettingsIcon, Box, Activity, ShieldAlert, Key, Copy, Check, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import Swal from 'sweetalert2';

export default function SettingsPage() {
  const { state, dispatch } = useApp();
  const [subTab, setSubTab] = useState<'profile' | 'inventory' | 'api-keys'>('profile');
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

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

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      if (data.keys) {
        setApiKeys(data.keys);
      }
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === 'inventory') {
      fetchInventorySettings();
    } else if (subTab === 'api-keys') {
      fetchApiKeys();
    }
  }, [subTab]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() })
      });
      const data = await res.json();
      if (data.success && data.key) {
        setApiKeys(prev => [data.key, ...prev]);
        setNewKeyName('');
        Swal.fire({
          title: '¡API Key Creada!',
          html: `<p class="text-xs mb-2">Copia tu clave ahora. Por seguridad, guárdala en un lugar seguro:</p><code class="bg-slate-100 dark:bg-slate-900 p-2 rounded text-xs select-all text-blue-600 font-mono block break-all">${data.key.key}</code>`,
          icon: 'success',
          confirmButtonColor: '#3b82f6'
        });
      } else {
        Swal.fire('Error', data.error || 'No se pudo crear la clave', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Error de conexión', 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (id: string, name: string) => {
    const confirm = await Swal.fire({
      title: '¿Revocar API Key?',
      text: `Se cancelará el acceso para "${name}". Las integraciones que la usen dejarán de funcionar.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, revocar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/keys?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          setApiKeys(prev => prev.filter(k => k.id !== id));
          Swal.fire('Revocada', 'La API Key ha sido eliminada.', 'success');
        }
      } catch (err) {
        Swal.fire('Error', 'No se pudo revocar la clave.', 'error');
      }
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

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

          <button
            onClick={() => setSubTab('api-keys')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'api-keys'
                ? 'bg-brand/10 text-brand shadow-sm border border-brand/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Key size={12} />
            <span>API Keys</span>
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

      {/* RENDER API KEYS SUBTAB */}
      {subTab === 'api-keys' && (
        <div className="bg-card border border-slate-200/60 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800">
            <div>
              <h2 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
                <Key size={18} className="text-brand" />
                <span>API Keys para Agentes e Integraciones</span>
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Genera credenciales seguras para que el Agente IA de WhatsApp (n8n) y los agentes de tu equipo consulten disponibilidad y tarifas por HTTP.
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider shrink-0">
              <ShieldCheck size={14} />
              <span>Autenticación Bearer Activa</span>
            </div>
          </div>

          {/* Create new key form */}
          <form onSubmit={handleCreateKey} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800 space-y-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-text-muted">Crear Nueva API Key</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Ej: Agente WhatsApp n8n, Agente Personal Juan..."
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                required
                className="flex-1 text-xs font-bold text-text-primary bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-brand"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={creatingKey || !newKeyName.trim()}
                className="h-10 px-6 font-black uppercase text-[11px] tracking-wider shrink-0 cursor-pointer"
              >
                <Plus size={14} className="mr-1" />
                {creatingKey ? 'Generando...' : 'Generar Key'}
              </Button>
            </div>
          </form>

          {/* List of keys */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-text-muted">Claves Activas ({apiKeys.length})</h3>
            
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand mx-auto"></div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Key size={24} className="mx-auto text-slate-400 mb-2 opacity-60" />
                <p className="text-xs font-bold text-text-muted uppercase">No hay API Keys generadas</p>
                <p className="text-[11px] text-text-secondary mt-0.5">Crea la primera para conectar el Agente IA de WhatsApp.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200/60 dark:border-slate-800 rounded-2xl overflow-hidden">
                {apiKeys.map(k => (
                  <div key={k.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/40 hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-text-primary tracking-tight">{k.name}</span>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          Activa
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {k.key ? `${k.key.substring(0, 14)}••••••••••••` : '••••••••••••'}
                        </code>
                        <span className="text-[10px] text-text-muted">
                          Creada: {new Date(k.created_at).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(k.id, k.key)}
                        className="p-2 text-slate-500 hover:text-brand bg-slate-100 dark:bg-slate-800 rounded-xl transition-all hover:scale-105 cursor-pointer"
                        title="Copiar API Key"
                      >
                        {copiedKeyId === k.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKey(k.id, k.name)}
                        className="p-2 text-slate-400 hover:text-red-500 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all hover:scale-105 cursor-pointer"
                        title="Revocar API Key"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

