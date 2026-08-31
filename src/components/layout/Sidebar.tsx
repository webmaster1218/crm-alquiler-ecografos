"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  LayoutDashboard, 
  Trello, 
  CheckSquare, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  ShieldCheck,
  Rocket,
  ClipboardList,
  Box,
  Truck,
  Package,
  FileSpreadsheet,
  Calendar,
  DollarSign
} from 'lucide-react';
import { cn } from '../../types';

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  adminOnly?: boolean;
  path?: string;
  subItems?: { id: string; label: string; path: string }[];
}

const routeMap: Record<string, string> = {
  chat: '/chat',
  dashboard: '/dashboard',
  contacts: '/contacts',
  pipeline: '/pipeline',
  tasks: '/tasks',
  admin: '/admin',
  reports: '/reports',
  settings: '/settings',
  alquileres: '/alquileres',
  calendario: '/calendario',
  liquidacion: '/liquidacion',
};

import { supabase } from '../../lib/supabaseClient';

export function Sidebar({ activeTab }: { activeTab?: string }) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const collapsed = state.sidebarCollapsed;
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});

  const groups: { title: string; items: MenuItem[] }[] = [
    {
      title: "Principal",
      items: [
        { id: 'chat', label: 'Mensajería', icon: MessageSquare, badge: 3 },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: "Operaciones",
      items: [
        { id: 'alquileres', label: 'Alquileres', icon: ClipboardList, path: '/alquileres' },
        { id: 'calendario', label: 'Calendario', icon: Calendar, path: '/calendario' },
        { id: 'tasks', label: 'Tareas', icon: CheckSquare },
      ]
    },
    {
      title: "Finanzas",
      items: [
        { id: 'liquidacion', label: 'Liquidación', icon: DollarSign, path: '/liquidacion' },
      ]
    },
    {
      title: "Comercial",
      items: [
        { id: 'contacts', label: 'Clientes', icon: Users },
        { id: 'pipeline', label: 'Pipeline', icon: Trello },
      ]
    },
    {
      title: "Administrar",
      items: [
        { id: 'admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
        { id: 'reports', label: 'Reportes', icon: BarChart3, adminOnly: true },
        { id: 'settings', label: 'Configuración', icon: Settings, adminOnly: true },
      ]
    }
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch({ type: 'SET_USER', payload: null });
  };

  const handleNav = (id: string, path?: string) => {
    if (path) {
      router.push(path);
      return;
    }
    const targetPath = routeMap[id];
    if (targetPath) router.push(targetPath);
  };

  return (
    <aside 
      onClick={() => {
        if (collapsed) {
          dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: false });
        }
      }}
      className={cn(
        "h-screen sticky top-0 bg-sidebar border-r border-white/10 transition-all duration-300 flex flex-col z-40 shadow-sm",
        collapsed ? "w-16 cursor-pointer" : "w-56 lg:w-60"
      )}
    >
      <div className="h-14 flex items-center px-4 border-b border-white/10 shrink-0">
         {!collapsed ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-300">
               <img 
                 src="/icono-fabrica-winners-sin-fondo.png" 
                 alt="Alquiler Ecografos Icon" 
                 className="w-8 h-8 object-contain"
               />
                <h1 className="text-[11px] font-black text-white tracking-tight uppercase italic">Alquiler<span className="text-brand-light">Ecografos</span></h1>
            </div>
         ) : (
            <img 
              src="/icono-fabrica-winners-sin-fondo.png" 
              alt="Alquiler Ecografos Icon" 
              className="w-8 h-8 object-contain mx-auto"
            />
         )}
      </div>

      <div className={cn(
        "flex-1 px-2 py-4 space-y-4 custom-scrollbar",
        collapsed ? "overflow-visible" : "overflow-y-auto"
      )}>
         {groups.map((group, groupIdx) => {
           const visibleItems = group.items.filter(item => {
             if (item.adminOnly) {
               return state.currentUser?.role === 'Superadmin' || state.currentUser?.role === 'Administrador';
             }
             return true;
           });

           if (visibleItems.length === 0) return null;

           return (
             <div key={groupIdx} className="space-y-1">
                 {!collapsed && (
                   <p className="px-3 text-[10px] font-black text-white/40 uppercase tracking-[0.15em] mb-1.5">
                     {group.title}
                   </p>
                 )}
               <nav className="space-y-0.5">
                 {visibleItems.map((item) => {
                   const hasSubItems = !!item.subItems;
                   const isParentActive = hasSubItems && item.subItems!.some(sub => pathname === sub.path);
                   const isActive = pathname === item.path || (hasSubItems && isParentActive);

                   return (
                     <div key={item.id} className="space-y-1">
                       <button
                         onClick={() => {
                           if (hasSubItems) {
                             if (collapsed) {
                               handleNav(item.id, item.subItems![0].path);
                             } else {
                               setOpenMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                             }
                           } else {
                             handleNav(item.id, item.path);
                           }
                         }}
                         title={collapsed ? item.label : undefined}
                         className={cn(
                           "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group relative cursor-pointer",
                           isActive && !hasSubItems
                             ? "bg-white/10 text-white font-extrabold border-l-2 border-white/50" 
                             : (isActive && hasSubItems ? "text-white font-extrabold" : "text-white/50 hover:bg-white/10 hover:text-white")
                         )}
                       >
                         <item.icon size={18} className={cn("shrink-0 transition-transform group-hover:scale-105", isActive ? "text-white" : "text-white/40")} />
                         {!collapsed && (
                           <span className="flex-1 text-left text-sm tracking-tight font-medium">{item.label}</span>
                         )}
                         {!collapsed && hasSubItems && (
                           <div className="text-white/40 transition-transform duration-200">
                             {openMenus[item.id] ? <ChevronLeft size={12} className="rotate-270" /> : <ChevronLeft size={12} />}
                           </div>
                         )}
                         {!collapsed && item.badge && !isActive && (
                           <span className="bg-danger text-white text-[8px] px-1.5 py-0.5 rounded-md font-black animate-pulse">
                             {item.badge}
                           </span>
                         )}
                         {isActive && !hasSubItems && (
                           <div className="absolute right-1.5 w-1 h-1 bg-brand rounded-full"></div>
                         )}
                         {collapsed && (
                           <div className="absolute left-full ml-4 px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-2xl border border-gray-200 dark:border-gray-700">
                             {item.label}
                           </div>
                         )}
                       </button>

                       {!collapsed && hasSubItems && openMenus[item.id] && (
                         <div className="pl-9 mt-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                           {item.subItems!.map((sub) => {
                             const isSubActive = pathname === sub.path;
                             return (
                               <button
                                 key={sub.id}
                                 onClick={() => handleNav(sub.id, sub.path)}
                                 className={cn(
                                   "w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all cursor-pointer block",
                                   isSubActive 
                                     ? "bg-white/10 text-white font-extrabold" 
                                     : "text-white/40 hover:bg-white/5 hover:text-white"
                                 )}
                               >
                                 {sub.label}
                               </button>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   );
                 })}
               </nav>
             </div>
           );
         })}
      </div>

      <div className="p-2 border-t border-white/10 shrink-0">
        {!collapsed && (
          <div 
            onClick={() => handleNav('settings')}
            className="mb-2 bg-white/5 p-2 rounded-lg border border-white/10 group cursor-pointer hover:bg-white/10 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center overflow-hidden shrink-0 text-xs font-black text-white/60">
                 {state.currentUser?.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate leading-none mb-0.5">{state.currentUser?.name}</p>
                <span className="text-[10px] font-medium text-white/50">{state.currentUser?.role}</span>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-1 text-white/40 hover:text-red-400 transition-colors"
            >
              <LogOut size={13} />
            </button>
          </div>
        )}

        <button 
          onClick={() => dispatch({ type: 'SET_SIDEBAR_COLLAPSED', payload: !collapsed })}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-white/50 hover:text-white transition-all font-black text-[9px] uppercase tracking-[0.2em]"
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={13} /> Contraer</>}
        </button>
      </div>
    </aside>
  );
}
