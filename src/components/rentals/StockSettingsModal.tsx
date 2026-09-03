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
    const [stock, setStock] = useState({ z6: 2, z60: 2, m7: 1 });

    useEffect(() => {
        if (isOpen) {
            const fetchCurrentStock = async () => {
                const currentStock = await getTotalStock();
                setStock(currentStock);
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
                    value: { z6: stock.z6, z60: stock.z60, m7: stock.m7 },
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Package size={24} className="text-blue-400" />
                        <h3 className="font-bold text-lg">Configuración de Stock</h3>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/10 p-1.5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Ajusta la cantidad total de equipos disponibles en el inventario global. Esto afectará la disponibilidad en el calendario.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                                    <HeartPulse size={20} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Mindray Z6</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase">Gama Media</p>
                                </div>
                            </div>
                            <input
                                type="number"
                                min="0"
                                className="w-20 text-center font-black text-lg bg-white border-2 border-slate-200 rounded-xl py-2 px-1 focus:border-blue-500 outline-none transition-all"
                                value={stock.z6}
                                onChange={e => setStock({ ...stock, z6: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                                    <HeartPulse size={20} className="text-blue-700" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Mindray Z60</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase">Gama Alta</p>
                                </div>
                            </div>
                            <input
                                type="number"
                                min="0"
                                className="w-20 text-center font-black text-lg bg-white border-2 border-slate-200 rounded-xl py-2 px-1 focus:border-blue-500 outline-none transition-all"
                                value={stock.z60}
                                onChange={e => setStock({ ...stock, z60: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                                    <HeartPulse size={20} className="text-blue-800" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">Mindray M7</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase">Cardiovascular Premium</p>
                                </div>
                            </div>
                            <input
                                type="number"
                                min="0"
                                className="w-20 text-center font-black text-lg bg-white border-2 border-slate-200 rounded-xl py-2 px-1 focus:border-blue-500 outline-none transition-all"
                                value={stock.m7}
                                onChange={e => setStock({ ...stock, m7: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <button
                        disabled={isLoading}
                        onClick={handleSave}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg hover:shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                        <Save size={20} />
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>
        </div>
    );
}
