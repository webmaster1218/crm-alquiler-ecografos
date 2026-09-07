"use client";

import { useState, useEffect } from "react";
import { X, Package, HeartPulse, Save } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { getTotalStock } from "../../lib/availability";


interface StockSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function StockSettingsModal({ isOpen, onClose, onSuccess }: StockSettingsModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [stock, setStock] = useState({ z6: 2, z60: 1, m7: 1, mx3: 1 });

    useEffect(() => {
        if (isOpen) {
            const fetchCurrentStock = async () => {
                const currentStock = await getTotalStock();
                setStock({
                    z6: currentStock.z6 ?? 2,
                    z60: currentStock.z60 ?? 1,
                    m7: currentStock.m7 ?? 1,
                    mx3: (currentStock as any).mx3 ?? 1
                });
            };
            fetchCurrentStock();
        }
    }, [isOpen]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            if (!supabase) throw new Error("Supabase no configurado");

            const { error } = await supabase
                .from('equipment_settings')
                .upsert({
                    key: 'inventory',
                    value: { z6: stock.z6, z60: stock.z60, m7: stock.m7, mx3: stock.mx3 },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al guardar inventario: " + (error as any).message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800">
                {/* Header */}
                <div className="bg-slate-950 px-6 py-5 text-white flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Package size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white">Configuración de Stock</h3>
                            <p className="text-[11px] text-slate-400 font-medium">Disponibilidad total de flota</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Ajusta la cantidad total de equipos disponibles en el inventario global. Esto afectará la disponibilidad en el calendario.
                    </p>

                    <div className="space-y-3">
                        {[
                            { key: 'z6' as const, name: 'Mindray Z6', cat: 'Gama Media', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20' },
                            { key: 'z60' as const, name: 'Mindray Z60', cat: 'Gama Alta', color: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20' },
                            { key: 'm7' as const, name: 'Mindray M7', cat: 'Cardiovascular Premium', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/20' },
                            { key: 'mx3' as const, name: 'Mindray MX3', cat: 'Nueva Gen Táctil', color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                        ].map((eq) => (
                            <div key={eq.key} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${eq.bg}`}>
                                        <HeartPulse size={17} className={eq.color} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200">{eq.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{eq.cat}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setStock({ ...stock, [eq.key]: Math.max(0, stock[eq.key] - 1) })}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-14 text-center font-bold text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 focus:border-blue-500 dark:focus:border-blue-400 text-slate-900 dark:text-white outline-none transition-all"
                                        value={stock[eq.key]}
                                        onChange={e => setStock({ ...stock, [eq.key]: Math.max(0, parseInt(e.target.value) || 0) })}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setStock({ ...stock, [eq.key]: stock[eq.key] + 1 })}
                                        className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        disabled={isLoading}
                        onClick={handleSave}
                        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        <Save size={15} />
                        {isLoading ? 'Guardando...' : 'Guardar Cambios de Stock'}
                    </button>
                </div>
            </div>
        </div>
    );
}
