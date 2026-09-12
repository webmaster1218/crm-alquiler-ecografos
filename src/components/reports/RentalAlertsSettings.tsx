"use client";

import React, { useState, useEffect } from 'react';
import {
  Bell,
  MessageSquare,
  Send,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Server,
  Key,
  Layers,
  RotateCcw,
  Sparkles,
  PhoneCall,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  RentalAlertsConfig,
  DEFAULT_ALERT_CONFIG,
  DEFAULT_ALERT_TEMPLATE,
  getAlertsConfig,
  saveAlertsConfig,
  formatAlertMessage
} from '../../lib/rentalAlerts';

export default function RentalAlertsSettings() {
  const [config, setConfig] = useState<RentalAlertsConfig>(DEFAULT_ALERT_CONFIG);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newPhone, setNewPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [instanceStatus, setInstanceStatus] = useState<'checking' | 'open' | 'close' | 'unknown'>('checking');

  // Cargar configuración existente desde la base de datos
  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const res = await fetch('/api/alquileres/config');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            setConfig(data.config);
            checkInstanceHealth(data.config.apiUrl, data.config.apiKey, data.config.instanceName);
            return;
          }
        }
        // Fallback directo a Supabase
        const loaded = await getAlertsConfig(supabase);
        setConfig(loaded);
        checkInstanceHealth(loaded.apiUrl, loaded.apiKey, loaded.instanceName);
      } catch (err) {
        console.error('Error cargando configuración:', err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Verificar estado de la instancia en Evolution API
  const checkInstanceHealth = async (url: string, key: string, instance: string) => {
    try {
      setInstanceStatus('checking');
      const cleanUrl = url.replace(/\/$/, '');
      const res = await fetch(`${cleanUrl}/instance/fetchInstances`, {
        headers: { apikey: key }
      });
      if (res.ok) {
        const instances = await res.json();
        const found = Array.isArray(instances)
          ? instances.find((i: any) => i.name?.toLowerCase() === instance?.toLowerCase())
          : null;
        if (found && found.connectionStatus === 'open') {
          setInstanceStatus('open');
        } else {
          setInstanceStatus('close');
        }
      } else {
        setInstanceStatus('close');
      }
    } catch (e) {
      setInstanceStatus('unknown');
    }
  };

  const handleAddPhone = () => {
    setPhoneError('');
    const clean = newPhone.trim();
    if (!clean) {
      setPhoneError('Ingresa un número telefónico');
      return;
    }
    const digitsOnly = clean.replace(/[^0-9]/g, '');
    if (digitsOnly.length < 8) {
      setPhoneError('El número es demasiado corto (mínimo 8 dígitos)');
      return;
    }

    // Formatear con prefijo + si no lo tiene
    const formatted = clean.startsWith('+') ? clean : `+${digitsOnly}`;

    if (config.phoneNumbers.includes(formatted)) {
      setPhoneError('Este número ya está en la lista');
      return;
    }

    setConfig(prev => ({
      ...prev,
      phoneNumbers: [...prev.phoneNumbers, formatted]
    }));
    setNewPhone('');
  };

  const handleRemovePhone = (indexToRemove: number) => {
    setConfig(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleInsertVariable = (variableTag: string) => {
    setConfig(prev => ({
      ...prev,
      messageTemplate: prev.messageTemplate + variableTag
    }));
  };

  const handleResetTemplate = () => {
    if (confirm('¿Deseas restablecer la plantilla al formato predeterminado?')) {
      setConfig(prev => ({
        ...prev,
        messageTemplate: DEFAULT_ALERT_TEMPLATE
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setTestResult(null);

    // Si el usuario escribió un número en el input y no presionó "Agregar", incluirlo automáticamente
    let phonesToSave = [...config.phoneNumbers];
    const pending = newPhone.trim();
    if (pending) {
      const digitsOnly = pending.replace(/[^0-9]/g, '');
      if (digitsOnly.length >= 8) {
        const formatted = pending.startsWith('+') ? pending : `+${digitsOnly}`;
        if (!phonesToSave.includes(formatted)) {
          phonesToSave.push(formatted);
          setNewPhone('');
        }
      }
    }

    const configToSave: RentalAlertsConfig = {
      ...config,
      phoneNumbers: phonesToSave,
    };

    try {
      // 1. Guardar a través del endpoint API del servidor
      const res = await fetch('/api/alquileres/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave),
      });

      const data = await res.json();

      if (data.success && data.config) {
        setConfig(data.config);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4500);
      } else {
        // Fallback guardado directo en Supabase
        const fallbackRes = await saveAlertsConfig(supabase, configToSave);
        if (fallbackRes.success) {
          setConfig(configToSave);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 4500);
        } else {
          alert(`Error al guardar: ${data.error || fallbackRes.error}`);
        }
      }
    } catch (err: any) {
      alert(`Error inesperado: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (config.phoneNumbers.length === 0) {
      alert('Debes agregar al menos un número telefónico para enviar la prueba.');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const samplePreview = formatAlertMessage(config.messageTemplate, {
        client_name: 'Dr. Carlos Mendoza (Prueba)',
        client_email: 'carlos.mendoza@ejemplo.com',
        client_phone: '+57 310 987 6543',
        client_type: 'Médico Especialista',
        document_number: '1020304050',
        tax_id: '1020304050-9',
        full_address: 'Calle 100 # 15-20, Consultorio 402, Bogotá',
        start_date: '2026-10-01',
        end_date: '2026-10-03',
        delivery_time: '7:00 AM - 8:00 AM',
        collection_time: '5:00 PM - 6:00 PM',
        total_days: 3,
        equipment_summary: 'ECOGRAFO Z60 CON CARRITO + TRANSDUCTOR CONVEXO',
        total_price: 710000
      });

      const res = await fetch('/api/alquileres/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          instanceName: config.instanceName,
          phoneNumbers: config.phoneNumbers,
          messageText: `🧪 MENSAJE DE PRUEBA DESDE EL CRM:\n\n${samplePreview}`
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || 'Mensaje de prueba enviado exitosamente a WhatsApp.'
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'No se pudo enviar el mensaje de prueba. Verifica la conexión con Evolution API.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Error de red: ${err.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  // Datos ficticios para la vista previa
  const previewText = formatAlertMessage(config.messageTemplate, {
    client_name: 'Dra. Valentina Ramos',
    client_email: 'valentina.ramos@clinica.com',
    client_phone: '+57 301 234 5678',
    client_type: 'Clínica / Institución',
    document_number: '900.123.456-1',
    tax_id: '900.123.456-1',
    full_address: 'Av. El Poblado # 10-30, Medellín',
    start_date: '2026-10-15',
    end_date: '2026-10-18',
    delivery_time: '7:00 AM - 8:00 AM',
    collection_time: '5:00 PM - 6:00 PM',
    total_days: 4,
    equipment_summary: 'ECOGRAFO M7 CON CARRITO + IMPRESORA',
    total_price: 1170000
  });

  const availableVariables = [
    { label: 'Nombre Cliente', tag: '{{client_name}}' },
    { label: 'Teléfono', tag: '{{client_phone}}' },
    { label: 'Documento / Cédula', tag: '{{document_number}}' },
    { label: 'RUT / NIT', tag: '{{tax_id}}' },
    { label: 'Correo', tag: '{{client_email}}' },
    { label: 'Dirección Completa', tag: '{{full_address}}' },
    { label: 'Fecha Entrega', tag: '{{start_date}}' },
    { label: 'Hora Entrega', tag: '{{delivery_time}}' },
    { label: 'Fecha Recogida', tag: '{{end_date}}' },
    { label: 'Hora Recogida', tag: '{{collection_time}}' },
    { label: 'Días Totales', tag: '{{total_days}}' },
    { label: 'Equipos Alquilados', tag: '{{equipment_summary}}' },
    { label: 'Precio Total', tag: '{{total_price}}' },
    { label: 'Fecha Solicitud', tag: '{{fecha_solicitud}}' },
  ];

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto"></div>
        <p className="text-xs text-text-secondary mt-3 font-semibold">Cargando configuración de alertas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner Principal de Configuración */}
      <div className="bg-card border border-slate-200/80 dark:border-slate-800 p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Bell size={20} />
              </span>
              <h2 className="text-lg font-black text-text-primary uppercase tracking-tight">
                Reportes y Alertas al Alquilar (WhatsApp)
              </h2>
            </div>
            <p className="text-xs text-text-secondary max-w-2xl">
              Envía automáticamente un reporte detallado por WhatsApp cada vez que un cliente complete una reserva en la web o en el CRM, utilizando tu instancia de <strong>Evolution API</strong>.
            </p>
          </div>

          {/* Switch Activar / Desactivar */}
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-text-primary">
              {config.enabled ? 'Alertas Activas' : 'Alertas Desactivadas'}
            </span>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                config.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Estado de Conexión Evolution API */}
        <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary font-medium">Instancia Evolution:</span>
            <span className="font-bold text-text-primary px-2 py-0.5 rounded bg-slate-200/50 dark:bg-slate-800 font-mono">
              {config.instanceName}
            </span>
            {instanceStatus === 'open' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Conectada (Open)
              </span>
            )}
            {instanceStatus === 'close' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full">
                Desconectada
              </span>
            )}
            {instanceStatus === 'checking' && (
              <span className="text-[11px] text-text-secondary">Verificando estado...</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => checkInstanceHealth(config.apiUrl, config.apiKey, config.instanceName)}
            className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1"
          >
            <RotateCcw size={12} /> Re-verificar conexión
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Configuración de Números y API (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Módulo: Destinatarios (Múltiples Números) */}
          <div className="bg-card border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="text-brand" size={16} /> Destinatarios del Reporte
              </h3>
              <span className="text-[11px] font-bold text-text-secondary">
                {config.phoneNumbers.length} número(s)
              </span>
            </div>

            <p className="text-xs text-text-secondary">
              Agrega los números de WhatsApp (administradores, asesores o logística) que recibirán la notificación de cada nuevo alquiler.
            </p>

            {/* Input para añadir nuevo número */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="+573005212664"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddPhone();
                    }
                  }}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/50 font-mono focus:outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={handleAddPhone}
                  className="px-3 py-2 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-all flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} /> Agregar
                </button>
              </div>
              {phoneError && (
                <p className="text-[11px] text-rose-500 font-semibold">{phoneError}</p>
              )}
            </div>

            {/* Lista de números configurados */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {config.phoneNumbers.map((phone, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <PhoneCall size={14} className="text-emerald-500 shrink-0" />
                    <span className="font-mono text-xs font-bold text-text-primary">{phone}</span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      En BD
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePhone(idx)}
                    title="Eliminar número"
                    className="text-text-secondary hover:text-rose-500 p-1 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {config.phoneNumbers.length === 0 && (
                <div className="p-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-text-secondary">
                  No has agregado ningún número de destino aún.
                </div>
              )}
            </div>

            <p className="text-[11px] text-text-secondary/70 italic">
              💡 Recuerda pulsar <strong>"Guardar Configuración"</strong> al agregar o quitar números para que los cambios se sincronicen en la base de datos de Supabase.
            </p>
          </div>

          {/* Módulo: Conexión Evolution API */}
          <div className="bg-card border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Server className="text-brand" size={16} /> Parámetros de Evolution API
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  URL de la API
                </label>
                <input
                  type="text"
                  value={config.apiUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                  placeholder="https://evolucion.telocalizo.co"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  Nombre de Instancia
                </label>
                <input
                  type="text"
                  value={config.instanceName}
                  onChange={(e) => setConfig(prev => ({ ...prev, instanceName: e.target.value }))}
                  placeholder="Jhon"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  API Key (Global o de Instancia)
                </label>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="92F2215F3451-48C5-8A45-325D1D9F8EC5"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-text-primary font-mono focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Editor de Plantilla y Vista Previa (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Editor de Plantilla de Mensaje */}
          <div className="bg-card border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="text-brand" size={16} /> Plantilla del Mensaje de Alerta
              </h3>
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-[11px] font-bold text-text-secondary hover:text-brand flex items-center gap-1 transition-colors"
                title="Restablecer plantilla inicial de n8n"
              >
                <RotateCcw size={12} /> Restablecer
              </button>
            </div>

            <p className="text-xs text-text-secondary">
              Personaliza el texto que recibirás en WhatsApp. Haz clic en las etiquetas para insertarlas dinámicamente en el mensaje:
            </p>

            {/* Chips de Variables Dinámicas */}
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
              {availableVariables.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleInsertVariable(v.tag)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-text-primary hover:border-brand hover:text-brand transition-all shadow-xs"
                >
                  + {v.label}
                </button>
              ))}
            </div>

            {/* Textarea del Mensaje */}
            <div>
              <textarea
                rows={12}
                value={config.messageTemplate}
                onChange={(e) => setConfig(prev => ({ ...prev, messageTemplate: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-text-primary font-mono leading-relaxed focus:outline-none focus:border-brand"
                placeholder="Escribe la plantilla del mensaje..."
              />
            </div>
          </div>

          {/* Vista Previa Estilo WhatsApp */}
          <div className="bg-card border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="text-emerald-500" size={16} /> Vista Previa en WhatsApp (Simulación)
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                En vivo
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#0b141a] text-slate-100 border border-slate-800 font-sans text-xs">
              <div className="bg-[#005c4b] p-3.5 rounded-xl rounded-tl-none max-w-lg shadow-sm whitespace-pre-line leading-relaxed text-slate-100 selection:bg-emerald-300 selection:text-slate-900">
                {previewText}
                <div className="text-[10px] text-slate-300/60 text-right mt-2 font-mono">
                  Ahora ✓✓
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Acciones Fija o Inferior */}
      <div className="bg-card border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 sticky bottom-4 shadow-lg z-20">
        <div className="flex items-center gap-2 text-xs">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-emerald-500 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl">
              <CheckCircle2 size={16} /> Configuración guardada correctamente
            </span>
          )}
          {testResult && (
            <span className={`flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl ${
              testResult.success ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
            }`}>
              {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {testResult.message}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Botón Enviar Prueba */}
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {testing ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-current"></div>
            ) : (
              <Send size={14} className="text-emerald-500" />
            )}
            Enviar Prueba a WhatsApp
          </button>

          {/* Botón Guardar Cambios */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-brand/90 transition-all shadow-md shadow-brand/20 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
            ) : (
              <Save size={14} />
            )}
            Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
