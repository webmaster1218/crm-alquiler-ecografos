'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import { User, Role } from '../../types';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const isAdminAuth = sessionStorage.getItem('admin_auth') === 'true';

      if (isAdminAuth) {
        if (!state.currentUser) {
          const appUser: User = {
            id: '41801508-ee2e-454a-b8a7-b07b60585d85',
            name: 'Administrador Principal',
            email: 'admin@ecoespecializada.com',
            role: 'Superadmin',
            status: 'En línea',
            avatar: undefined,
            activeConversations: 0,
            lastAccess: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          dispatch({ type: 'SET_USER', payload: appUser });
        }
        if (pathname === '/login') {
          router.push('/dashboard');
        } else {
          setChecking(false);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (pathname !== '/login') {
          router.push('/login');
        } else {
          setChecking(false);
        }
        return;
      }

      if (!state.currentUser) {
        const authUser = session.user;
        const { data: profile } = await supabase
          .from('crm_usuarios')
          .select('*')
          .eq('id', authUser.id)
          .single();

        let userRole: Role = 'Agente';
        let userName = authUser.email?.split('@')[0] || 'Usuario';

        if (profile) {
          userName = profile.full_name || userName;
          const dbRole = profile.role;
          if (dbRole === 'admin' || dbRole === 'Administrador' || dbRole === 'Superadmin') {
            userRole = 'Superadmin';
          } else if (dbRole === 'supervisor' || dbRole === 'Supervisor') {
            userRole = 'Supervisor';
          } else {
            userRole = 'Agente';
          }
        }

        const appUser: User = {
          id: authUser.id,
          name: userName,
          email: authUser.email || '',
          role: userRole,
          status: 'En línea',
          avatar: profile?.avatar_url || undefined,
          activeConversations: 0,
          lastAccess: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        dispatch({ type: 'SET_USER', payload: appUser });
      }

      if (pathname === '/login') {
        router.push('/dashboard');
      } else {
        setChecking(false);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (sessionStorage.getItem('admin_auth') === 'true') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        dispatch({ type: 'SET_USER', payload: null });
        router.push('/login');
      } else if (event === 'SIGNED_IN' && session) {
        const authUser = session.user;
        const { data: profile } = await supabase
          .from('crm_usuarios')
          .select('*')
          .eq('id', authUser.id)
          .single();

        let userRole: Role = 'Agente';
        let userName = authUser.email?.split('@')[0] || 'Usuario';

        if (profile) {
          userName = profile.full_name || userName;
          const dbRole = profile.role;
          if (dbRole === 'admin' || dbRole === 'Administrador' || dbRole === 'Superadmin') {
            userRole = 'Superadmin';
          } else if (dbRole === 'supervisor' || dbRole === 'Supervisor') {
            userRole = 'Supervisor';
          } else {
            userRole = 'Agente';
          }
        }

        const appUser: User = {
          id: authUser.id,
          name: userName,
          email: authUser.email || '',
          role: userRole,
          status: 'En línea',
          avatar: profile?.avatar_url || undefined,
          activeConversations: 0,
          lastAccess: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        dispatch({ type: 'SET_USER', payload: appUser });
        if (pathname === '/login') {
          router.push('/dashboard');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, state.currentUser, router, dispatch]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
      </div>
    );
  }

  return <>{children}</>;
}
