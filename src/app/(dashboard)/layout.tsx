"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { MobileNav } from '../../components/layout/MobileNav';
import { cn } from '../../types';

const tabFromPath = (pathname: string): string => {
  const segment = pathname.split('/')[1];
  if (!segment) return 'dashboard';
  return segment;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const { state, dispatch } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = tabFromPath(pathname);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted && !state.currentUser) {
      const authPin = typeof window !== 'undefined' ? sessionStorage.getItem('admin_auth') : null;
      if (authPin === 'true') {
        dispatch({
          type: 'SET_USER',
          payload: {
            id: 'admin-master-id',
            name: 'Administrador ECO',
            email: 'admin@ecoespecializada.com',
            role: 'Superadmin',
            status: 'En línea',
            activeConversations: 0,
            lastAccess: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        });
      } else {
        router.push('/login');
      }
    }
  }, [mounted, state.currentUser, router, dispatch]);

  React.useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  if (!mounted || !state.currentUser) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page transition-colors duration-500 font-sans">
      <div className="flex">
        <div className={cn(
          "hidden md:block transition-all duration-300 shrink-0",
          state.sidebarCollapsed ? "w-16" : "w-56 lg:w-60"
        )}>
          <Sidebar activeTab={activeTab} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          <Header activeTab={activeTab} />
          <main className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'chat' ? (
              <div className="flex-1 h-[calc(100vh-56px)] overflow-hidden">
                {children}
              </div>
            ) : (
              <div className="max-w-[1600px] w-full mx-auto p-3 md:p-6 lg:p-8 pb-20 md:pb-8 overflow-y-auto">
                {children}
              </div>
            )}
          </main>
        </div>
      </div>

      <div className="md:hidden">
        <MobileNav activeTab={activeTab} />
      </div>
    </div>
  );
}
