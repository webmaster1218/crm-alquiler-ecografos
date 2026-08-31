"use client";

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  MessageCircle,
  ClipboardList,
  Box,
  MoreHorizontal,
  X,
  Users,
  Trello,
  CheckSquare,
  BarChart3,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Package,
  FileText,
  Truck,
  AlertCircle,
  RotateCcw,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileNavProps {
  activeTab: string;
}

// All navigation groups matching the sidebar structure
const allGroups = [
  {
    title: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { id: 'chat', label: 'Mensajería', icon: MessageCircle, path: '/chat', badge: 3 },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { id: 'alquileres', label: 'Alquileres', icon: ClipboardList, path: '/alquileres' },
      { id: 'calendario', label: 'Calendario', icon: ClipboardList, path: '/calendario' }, // We'll map to calendar icon via import dynamically or use list
      { id: 'tasks', label: 'Tareas', icon: CheckSquare, path: '/tasks' },
    ],
  },
  {
    title: 'Finanzas',
    items: [
      { id: 'liquidacion', label: 'Liquidación', icon: FileSpreadsheet, path: '/liquidacion' },
    ],
  },
  {
    title: 'Comercial',
    items: [
      { id: 'contacts', label: 'Clientes', icon: Users, path: '/contacts' },
      { id: 'pipeline', label: 'Pipeline', icon: Trello, path: '/pipeline' },
    ],
  },
  {
    title: 'Administrar',
    items: [
      { id: 'admin', label: 'Admin', icon: ShieldCheck, path: '/admin', adminOnly: true },
      { id: 'reports', label: 'Reportes', icon: BarChart3, path: '/reports', adminOnly: true },
      { id: 'settings', label: 'Configuración', icon: Settings, path: '/settings', adminOnly: true },
    ],
  },
];

// The 4 main pinned shortcuts in the bottom bar
const pinnedItems = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'chat', label: 'Mensajes', icon: MessageCircle, path: '/chat', badge: 3 },
  { id: 'alquileres', label: 'Alquileres', icon: ClipboardList, path: '/alquileres' },
  { id: 'contacts', label: 'Clientes', icon: Users, path: '/contacts' },
];

export function MobileNav({ activeTab }: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = state.currentUser?.role === 'Superadmin' || state.currentUser?.role === 'Administrador';

  const navigate = (path: string) => {
    router.push(path);
    setMenuOpen(false);
  };

  const isActive = (itemId: string) => {
    if (itemId === 'alquileres') {
      return activeTab === 'alquileres';
    }
    if (itemId === 'contacts') {
      return activeTab === 'contacts';
    }
    return activeTab === itemId;
  };

  return (
    <>
      {/* Full-Screen Menu Panel */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Slide-up Panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl border-t border-slate-200/30 dark:border-slate-800 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-2">
                  <img
                    src="/icono-fabrica-winners-sin-fondo.png"
                    alt="Alquiler Ecografos"
                    className="w-6 h-6 object-contain"
                  />
                  <span className="text-sm font-black text-text-primary uppercase tracking-tight italic">
                    Alquiler<span className="text-blue-400">Ecografos</span>
                  </span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-text-muted active:scale-90 transition-transform"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Navigation Groups */}
              <div className="px-4 py-3 pb-8 space-y-5">
                {allGroups.map((group) => {
                  const visibleItems = group.items.filter(
                    (item) => !(item as any).adminOnly || isAdmin
                  );
                  if (visibleItems.length === 0) return null;

                  return (
                    <div key={group.title}>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-muted mb-2 px-1">
                        {group.title}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {visibleItems.map((item) => {
                          const IconComp = item.icon;
                          const active =
                            activeTab === item.id ||
                            pathname === item.path;
                          return (
                            <button
                              key={item.id}
                              onClick={() => navigate(item.path)}
                              className={cn(
                                'flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-90',
                                active
                                  ? 'bg-brand/10 border-brand/30 text-brand'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-700/40 text-text-muted hover:text-text-primary hover:border-slate-300 dark:hover:border-slate-600'
                              )}
                            >
                              <div className="relative">
                                <IconComp size={20} />
                                {(item as any).badge && (
                                  <span className="absolute -top-1 -right-1 bg-brand text-white text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-black">
                                    {(item as any).badge}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-center leading-tight">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-slate-200/50 dark:border-slate-800 px-1 flex items-center justify-around z-30">
        {pinnedItems.map((item) => {
          const IconComp = item.icon;
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative active:scale-90 transition-all',
                active ? 'text-brand' : 'text-text-muted'
              )}
            >
              {active && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand"
                />
              )}
              <div className="relative">
                <IconComp size={21} />
                {(item as any).badge && (
                  <span className="absolute -top-1.5 -right-1.5 bg-brand text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black border-2 border-card">
                    {(item as any).badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}

        {/* "More" button */}
        <button
          onClick={() => setMenuOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 flex-1 h-full active:scale-90 transition-all',
            menuOpen ? 'text-brand' : 'text-text-muted'
          )}
        >
          <MoreHorizontal size={21} />
          <span className="text-[10px] font-bold">Más</span>
        </button>
      </nav>
    </>
  );
}
