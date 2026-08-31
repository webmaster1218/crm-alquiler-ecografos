'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { useApp } from '../../context/AppContext';
import { User, Role, UserStatus } from '../../types';
import { Eye, EyeOff } from 'lucide-react';

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
    // Si ya hay una sesión activa, cargar el usuario en el contexto y redirigir
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        await handleSetUserContext(session.user);
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  const handleSetUserContext = async (authUser: any) => {
    // Consultar el perfil en crm_usuarios
    const { data: profile, error } = await supabase
      .from('crm_usuarios')
      .select('*')
      .eq('id', authUser.id)
      .single();

    let userRole: Role = 'Agente';
    let userName = authUser.email?.split('@')[0] || 'Usuario';

    if (profile) {
      userName = profile.full_name || userName;
      // Mapear rol a roles válidos del tipo Role
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
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
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
        if ((email.toLowerCase() === 'admin' || email.toLowerCase() === 'admin@ecoespecializada.com') && password === ADMIN_PIN) {
          sessionStorage.setItem('admin_auth', 'true');
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
          router.push('/dashboard');
          return;
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
    <div className="min-h-screen bg-page flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-orange-600/5 dark:bg-orange-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-600/5 dark:bg-amber-600/10 blur-[120px]" />

      <div className="w-full max-w-md bg-card border border-slate-200/60 dark:border-slate-850 rounded-2xl shadow-xl p-8 relative z-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <img 
            src="/icono-fabrica-winners-sin-fondo.png" 
            alt="Telocalizo Chats Logo" 
            className="w-20 h-20 object-cover border border-brand/10 mb-3 shadow-lg shadow-brand/5"
          />
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight bg-gradient-to-r from-orange-600 to-amber-600 dark:from-orange-400 dark:to-amber-400 bg-clip-text text-transparent">
            Telocalizo Chats
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            {isRegistering ? 'Crea una cuenta para comenzar' : 'Inicia sesión para acceder a tu panel'}
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm mb-6 ${
            message.type === 'error' 
              ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/25' 
              : 'bg-emerald-500/15 text-emerald-650 dark:text-emerald-400 border border-emerald-500/25'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-text-primary rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Usuario o Correo Electrónico
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com o admin"
              className="w-full bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-text-primary rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-100/80 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-text-primary rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-lg py-3 text-sm font-semibold transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
          >
            {loading ? 'Procesando...' : isRegistering ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-200 dark:border-slate-800/60 pt-6">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setMessage(null);
            }}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            {isRegistering 
              ? '¿Ya tienes cuenta? Inicia sesión' 
              : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </div>
    </div>
  );
}
