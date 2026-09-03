"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { 
  Sun, 
  Moon, 
  Bell, 
  Search, 
  Menu, 
  UserCircle, 
  LogOut, 
  Settings, 
  CheckSquare, 
  ShieldCheck, 
  ChevronDown 
} from 'lucide-react';
import { Button } from '../shared/Button';
import { Avatar } from '../shared/Avatar';
import { cn } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

const routeMap: Record<string, string> = {
  settings: '/settings',
  tasks: '/tasks',
};

import { supabase } from '../../lib/supabaseClient';

export function Header({ activeTab }: { activeTab?: string }) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleNav = (id: string) => {
    const path = routeMap[id];
    if (path) router.push(path);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_auth');
        localStorage.removeItem('admin_auth');
      }
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: 'SET_USER', payload: null });
      setMenuOpen(false);
      router.push('/login');
    }
  };


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="h-14 bg-header sticky top-0 z-30 border-b border-white/10 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="text-[10px] font-black text-white/60 uppercase tracking-[0.25em] flex items-center gap-2">
          Alquiler de Ecógrafos <span className="opacity-30">/</span> <span className="text-white italic tracking-tighter lowercase text-xs underline decoration-brand-light decoration-2 underline-offset-4">{activeTab}</span>
        </h2>


        <div className="relative w-full max-w-sm group hidden xl:block">
          <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none group-focus-within:text-brand-light text-white/40 transition-colors">
            <Search size={14} />
          </div>
          <input
            type="text"
            className="block w-full pl-8 pr-3 py-1.5 bg-white/10 border border-white/10 focus:border-brand-light/40 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:bg-white/15 transition-all text-[11px] font-bold text-white placeholder:text-white/40"
            placeholder="Búsqueda rápida... (⌘K)"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden sm:flex items-center bg-white/10 p-0.5 rounded-lg border border-white/10">
           <button
             onClick={() => dispatch({ type: 'SET_THEME', payload: false })}
             className={cn("p-1 rounded-md transition-all cursor-pointer", !state.darkMode ? "bg-white/20 shadow-sm text-white" : "text-white/50 hover:text-white")}
           >
             <Sun size={14} />
           </button>
           <button
             onClick={() => dispatch({ type: 'SET_THEME', payload: true })}
             className={cn("p-1 rounded-md transition-all cursor-pointer", state.darkMode ? "bg-white/20 shadow-sm text-white" : "text-white/50 hover:text-white")}
           >
             <Moon size={14} />
           </button>
        </div>

        <div className="relative">
          <button className="p-2 rounded-lg hover:bg-white/10 text-white/50 transition-all relative group active:scale-95">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full border-2 border-[var(--header)] shadow-[0_0_8px_var(--brand)]"></span>
          </button>
        </div>

        <div className="h-5 w-[1px] bg-white/20 mx-0.5"></div>

        <div className="relative" ref={menuRef}>
          <div 
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1.5 pl-0.5 group cursor-pointer hover:opacity-90 active:scale-95 transition-all"
          >
            <Avatar name={state.currentUser?.name || ''} size="sm" className="ring-2 ring-white/20 transition-all group-hover:ring-white/50 group-hover:scale-105" />
            <ChevronDown size={11} className={cn("text-white/50 group-hover:text-white transition-transform duration-250 shrink-0", menuOpen ? "rotate-180" : "")} />
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-56 bg-card border border-slate-200/50 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1"
              >
                <div className="px-3.5 py-2.5 border-b border-slate-200/50 dark:border-slate-800 bg-card-alt">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={state.currentUser?.name || ''} size="sm" className="ring-1 ring-slate-200/50 dark:ring-slate-700" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-text-primary truncate tracking-tight">{state.currentUser?.name}</p>
                      <p className="text-[9px] text-text-muted truncate tracking-tight mb-1">{state.currentUser?.email}</p>
                      <div className="inline-flex items-center gap-1 bg-brand-bg text-brand text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                        <ShieldCheck size={9} />
                        {state.currentUser?.role}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => handleNav('settings')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-text-secondary hover:bg-hover hover:text-brand transition-colors text-left cursor-pointer"
                  >
                    <Settings size={13} className="text-text-muted" />
                    <span>Mi Perfil y Ajustes</span>
                  </button>

                  <button
                    onClick={() => handleNav('tasks')}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-text-secondary hover:bg-hover hover:text-brand transition-colors text-left cursor-pointer"
                  >
                    <CheckSquare size={13} className="text-text-muted" />
                    <span>Mis Tareas</span>
                  </button>

                  <div className="px-2.5 py-1.5 flex items-center justify-between text-[10px] font-bold text-text-secondary">
                    <div className="flex items-center gap-2">
                      {state.darkMode ? (
                        <>
                          <Moon size={13} className="text-text-muted" />
                          <span>Modo Oscuro</span>
                        </>
                      ) : (
                        <>
                          <Sun size={13} className="text-text-muted" />
                          <span>Modo Claro</span>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
                      className={cn(
                        "w-7 h-4 rounded-full transition-all relative flex items-center cursor-pointer",
                        state.darkMode ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'
                      )}
                    >
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full bg-card transition-all absolute",
                        state.darkMode ? 'left-4' : 'left-0.5'
                      )}></div>
                    </button>
                  </div>
                </div>

                <div className="p-1 border-t border-slate-200/50 dark:border-slate-800">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-danger hover:bg-danger-bg transition-colors text-left cursor-pointer"
                  >
                    <LogOut size={13} className="text-danger" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
