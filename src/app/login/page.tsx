'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import { User, Role } from '../../types';
import { Eye, EyeOff, Stethoscope, ShieldCheck, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();
  const { dispatch } = useApp();

  useEffect(() => {
    // Si ya hay una sesión activa en Supabase o admin_auth, redirigir
    const checkSession = async () => {
      const authPin = sessionStorage.getItem('admin_auth');
      if (authPin === 'true') {
        router.push('/dashboard');
        return;
      }

      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          await handleSetUserContext(session.user);
          router.push('/dashboard');
        }
      }
    };
    checkSession();
  }, [router]);

  const handleSetUserContext = async (authUser: any) => {
    let userRole: Role = 'Superadmin';
    let userName = authUser.email?.split('@')[0] || 'Administrador';

    if (supabase) {
      const { data: profile } = await supabase
        .from('crm_usuarios')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

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
    }

    const appUser: User = {
      id: authUser.id,
      name: userName,
      email: authUser.email || '',
      role: userRole,
      status: 'En línea',
      avatar: undefined,
      activeConversations: 0,
      lastAccess: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    dispatch({ type: 'SET_USER', payload: appUser });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isRegistering) {
        if (!supabase) throw new Error('Supabase no está configurado');

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        setMessage({
          type: 'success',
          text: '¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.',
        });
        setIsRegistering(false);
      } else {
        const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || 'admin123';
        
        // Acceso rápido de administración local
        if (
          (email.toLowerCase() === 'admin' || 
           email.toLowerCase() === 'admin@ecoespecializada.com' || 
           email.toLowerCase() === 'admin@alquilerdeecografos.com') && 
          (password === ADMIN_PIN || password === 'admin123' || password === 'admin')
        ) {
          sessionStorage.setItem('admin_auth', 'true');
          const appUser: User = {
            id: 'admin-master-id',
            name: 'Administrador ECO',
            email: 'admin@ecoespecializada.com',
            role: 'Superadmin',
            status: 'En línea',
            activeConversations: 0,
            lastAccess: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          dispatch({ type: 'SET_USER', payload: appUser });
          router.push('/dashboard');
          return;
        }

        if (!supabase) {
          throw new Error('Supabase no está inicializado. Verifica el archivo .env');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          await handleSetUserContext(data.user);
        }
        router.push('/dashboard');
      }
    } catch (error: any) {
      let errMsg = error.message || 'Ocurrió un error inesperado.';
      if (errMsg === 'Invalid login credentials') {
        errMsg = 'Usuario o contraseña incorrectos.';
      }
      setMessage({
        type: 'error',
        text: errMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-[600px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-200/80 p-8 md:p-10 relative z-10">
        
        {/* Header con identidad oficial de Alquiler de Ecógrafos */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4 relative w-56 h-14">
            <img 
              src="/images/logo/logo_alquilerdeecografos.webp" 
              alt="Alquiler de Ecógrafos" 
              className="w-full h-full object-contain"
            />
          </div>

          <span className="text-[11px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5 mb-2">
            <ShieldCheck size={13} /> Panel Administrativo
          </span>

          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Acceso al CRM
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRegistering ? 'Crea una cuenta para el equipo' : 'Ingresa tus credenciales para gestionar reservas y flota'}
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs font-semibold mb-6 ${
            message.type === 'error' 
              ? 'bg-rose-50 text-rose-600 border border-rose-200' 
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Juan Pérez"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 font-medium"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Usuario o Correo Electrónico
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin o tu@correo.com"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 text-sm font-black transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock size={16} />
            {loading ? 'Verificando...' : isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-5">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setMessage(null);
            }}
            className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
          >
            {isRegistering 
              ? '¿Ya tienes cuenta? Inicia sesión' 
              : '¿Deseas registrar un nuevo colaborador?'}
          </button>
        </div>
      </div>
    </div>
  );
}

