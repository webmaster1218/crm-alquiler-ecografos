import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Search, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Mail, 
  Globe,
  MoreVertical,
  CheckCheck,
  Paperclip,
  Smile,
  Send,
  UserPlus,
  ArrowLeft,
  X,
  FileText,
  Plus,
  MessageSquare,
  Info,
  ChevronDown,
  Clock,
  User as UserIcon,
  Shield,
  Tag,
  Users2,
  Cpu,
  Layers,
  Rocket,
  LifeBuoy,
  Smartphone,
  Check,
  Zap,
  HelpCircle,
  Share2,
  Trash2,
  Settings,
  Star,
  Activity,
  AlertCircle,
  VolumeX,
  Filter,
  ArrowUpDown,
  Lock,
  RefreshCw,
  ChevronUp,
  Sliders,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { Message, Conversation, Contact } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

const CANNED_RESPONSES = [
  "Hola, encantado de saludarte. ¿Cómo te puedo ayudar hoy con tu consulta de Telocalizo?",
  "¡Es una excelente pregunta! Para darte la información exacta, ¿podrías indicarme tu correo y tu empresa?",
  "Perfecto, acabo de actualizar tu caso. Nuestro equipo técnico revisará los detalles y te responderá en minutos.",
  "Muchas gracias por confirmar. Quedamos a tu entera disposición. ¡Que tengas un excelente día!",
  "El contrato legal ya ha sido recibido. Empezaremos tu proceso de inducción u Onboarding mañana mismo."
];

export function ChatInbox() {
  const { state, dispatch } = useApp();
  const [selectedConvId, setSelectedConvId] = useState(state.conversations[0]?.id);
  
  // Custom Filters matching Chatwoot Subcategories
  const [inboxSubFilter, setInboxSubFilter] = useState<'all' | 'mentions' | 'unassigned' | 'resolved'>('all');
  const [activeChannelFilter, setActiveChannelFilter] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [activeTeamFilter, setActiveTeamFilter] = useState<string | null>(null);
  
  // Core State
  const [activeTab, setActiveTab] = useState<'All' | 'Mine' | 'Unassigned'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const [showProfile, setShowProfile] = useState(true);
  const [showCannedList, setShowCannedList] = useState(false);
  
  // Tag creation input
  const [newTagInput, setNewTagInput] = useState('');

  // Right sidebar collapsible panels
  const [expandedSections, setExpandedSections] = useState({
    conversations: true,
    agent: true,
    team: true,
    priority: true,
    labels: true
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const selectedConv = state.conversations.find(c => c.id === selectedConvId);
  const contact = state.contacts.find(c => c.id === selectedConv?.contactId);

  // Auto scroll to bottom when chat updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages?.length, selectedConvId]);

  const handleNav = (id: string) => {
    window.dispatchEvent(new CustomEvent('nav-change', { detail: id }));
  };

  const handleSendMessage = (e?: React.FormEvent, customTxt?: string) => {
    if (e) e.preventDefault();
    const contentToSend = customTxt || message;
    if (!contentToSend.trim() || !selectedConvId) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: state.currentUser?.name || 'Yo',
      content: contentToSend,
      timestamp: new Date().toISOString(),
      isInternal: isInternalNote
    };

    dispatch({ 
      type: 'ADD_MESSAGE', 
      payload: { convId: selectedConvId, message: newMessage } 
    });

    if (!customTxt) setMessage('');
    setShowCannedList(false);
  };

  // Chatwoot action: change Conversation Priority
  const handleSetPriority = (priority: 'Baja' | 'Media' | 'Alta') => {
    if (!selectedConv) return;
    const systemMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'Sistema',
      content: `cambió la prioridad de la conversación a ${priority}`,
      timestamp: new Date().toISOString(),
      isInternal: true
    };

    const updated: Conversation = {
      ...selectedConv,
      priority,
      messages: [...selectedConv.messages, systemMsg]
    };

    dispatch({ type: 'UPDATE_CONVERSATION', payload: updated });
  };

  // Chatwoot action: Assign dynamic agents
  const handleAssignAgent = (userId: string) => {
    if (!selectedConv) return;
    const targetUser = state.users.find(u => u.id === userId);
    const agentName = targetUser?.name || 'otro agente';

    const systemMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'Sistema',
      content: `asignó esta conversación a ${agentName}`,
      timestamp: new Date().toISOString(),
      isInternal: true
    };

    const updated: Conversation = {
      ...selectedConv,
      assignedTo: userId,
      messages: [...selectedConv.messages, systemMsg]
    };

    dispatch({ type: 'UPDATE_CONVERSATION', payload: updated });
  };

  // Chatwoot action: Toggle Open vs Resolved Ticket
  const handleToggleStatus = () => {
    if (!selectedConv) return;
    const nextStatus = selectedConv.status === 'Resuelta' ? 'Abierta' : 'Resuelta';
    const userDisplayName = state.currentUser?.name || 'Agente';

    const systemMsg: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'Sistema',
      content: nextStatus === 'Resuelta' 
        ? `marcó la conversación como Resuelta` 
        : `reabrió la conversación`,
      timestamp: new Date().toISOString(),
      isInternal: false
    };

    const updated: Conversation = {
      ...selectedConv,
      status: nextStatus,
      messages: [...selectedConv.messages, systemMsg]
    };

    dispatch({ type: 'UPDATE_CONVERSATION', payload: updated });
  };

  // Chatwoot action: Add a custom tag directly onto customer (labels)
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !newTagInput.trim()) return;
    const sanitized = newTagInput.trim();
    if (contact.tags.includes(sanitized)) {
      setNewTagInput('');
      return;
    }
    const updatedContact: Contact = {
      ...contact,
      tags: [...contact.tags, sanitized]
    };
    dispatch({ type: 'UPDATE_CONTACT', payload: updatedContact });
    setNewTagInput('');
  };

  // Chatwoot action: Remove label
  const handleRemoveTag = (tagToRemove: string) => {
    if (!contact) return;
    const updatedContact: Contact = {
      ...contact,
      tags: contact.tags.filter(t => t !== tagToRemove)
    };
    dispatch({ type: 'UPDATE_CONTACT', payload: updatedContact });
  };

  const channelIcons: Record<string, React.ReactNode> = {
    WhatsApp: <MessageCircle className="text-emerald-500 shrink-0" size={13} />,
    Instagram: <Instagram className="text-pink-500 shrink-0" size={13} />,
    Facebook: <Facebook className="text-blue-600 shrink-0" size={13} />,
    Email: <Mail className="text-amber-500 shrink-0" size={13} />,
    'Web Chat': <Globe className="text-indigo-500 shrink-0" size={13} />,
  };

  const channelLabels: Record<string, string> = {
    WhatsApp: "PaperLayer Whatsapp",
    Instagram: "PaperLayer Instagram",
    Facebook: "PaperLayer Facebook",
    Email: "PaperLayer Email",
    'Web Chat': "PaperLayer Website",
  };

  // Filter conversations based on Left Nav sidebar categories & central tab searches
  const filteredConversations = state.conversations.filter(conv => {
    const convContact = state.contacts.find(c => c.id === conv.contactId);
    if (!convContact) return false;

    // Search query constraint
    if (searchQuery.trim() !== '') {
      const matchName = `${convContact.firstName} ${convContact.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCompany = (convContact.company || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchMsg = conv.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchName && !matchCompany && !matchMsg) return false;
    }

    // Channel constraint
    if (activeChannelFilter && conv.channel !== activeChannelFilter) return false;

    // Tag constraint
    if (activeTagFilter && !convContact.tags.includes(activeTagFilter)) return false;

    // Team constraint (simulation of active sectors)
    if (activeTeamFilter) {
      if (activeTeamFilter === 'sales' && convContact.score < 70) return false;
      if (activeTeamFilter === 'ops' && !['TechSolutions S.A.', 'Grupo Éxito', 'Constructora Bolívar'].includes(convContact.company)) return false;
      if (activeTeamFilter === 'support' && !convContact.tags.includes('Requiere soporte') && conv.status !== 'En espera') return false;
    }

    // Inbox sub-category directories from Left Mini Rail
    if (inboxSubFilter === 'unassigned' && conv.assignedTo) return false;
    if (inboxSubFilter === 'resolved' && conv.status !== 'Resuelta') return false;
    if (inboxSubFilter === 'mentions') {
      // Simulate notes that tag us (e.g. "@Admin" or "@Yo")
      return conv.messages.some(m => m.content.includes('@') || m.isInternal);
    }
    
    // Top central active quick filters (Míos vs Sin Asignar vs Todos)
    if (activeTab === 'Mine' && conv.assignedTo !== (state.currentUser?.id || 'u1')) return false;
    if (activeTab === 'Unassigned' && conv.assignedTo) return false;

    // General: if not filtered for resolved explicitly, usually show active inbox
    if (inboxSubFilter !== 'resolved' && conv.status === 'Resuelta' && inboxSubFilter !== 'all') return false;

    return true;
  });

  // Calculations for badge indicators
  const totalMine = state.conversations.filter(c => c.assignedTo === (state.currentUser?.id || 'u1') && c.status !== 'Resuelta').length;
  const totalUnassigned = state.conversations.filter(c => !c.assignedTo && c.status !== 'Resuelta').length;
  const totalAllOpen = state.conversations.filter(c => c.status !== 'Resuelta').length;

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full flex bg-slate-50 dark:bg-[#0B0F19] text-slate-850 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* 1. COLUMN 1: LEFT SUB-RAIL (Chatwoot Inner Navigation Channels) */}
      <div className="hidden lg:flex flex-col w-48 shrink-0 bg-slate-50 dark:bg-[#0E1524] border-r border-slate-200/75 dark:border-slate-800/80 p-2.5 overflow-y-auto custom-scrollbar">
        <div className="mb-4 px-2 py-1">
          <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.15em]">Espacio de trabajo</p>
          <div className="flex items-center gap-2 mt-1.5 bg-white dark:bg-slate-900 border border-slate-250/60 dark:border-slate-800 rounded-xl p-2 shadow-sm">
            <div className="w-5 h-5 bg-gradient-to-br from-orange-500 to-amber-600 rounded-md flex items-center justify-center text-[10px] font-bold text-white uppercase italic">T</div>
            <span className="text-[11px] font-black truncate text-slate-700 dark:text-slate-200 uppercase tracking-tight">Telocalizo Chats</span>
          </div>
        </div>

        {/* Categories Section */}
        <div className="space-y-1 mb-5">
          <button 
            onClick={() => {
              setInboxSubFilter('all');
              setActiveChannelFilter(null);
              setActiveTagFilter(null);
              setActiveTeamFilter(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${inboxSubFilter === 'all' && !activeChannelFilter && !activeTagFilter && !activeTeamFilter ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-150/40 dark:hover:bg-slate-800/30'}`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={13} />
              <span>Todos los chats</span>
            </div>
            <span className="text-[10px] dark:opacity-80 px-1 opacity-60 font-bold">{totalAllOpen}</span>
          </button>

          <button 
            onClick={() => {
              setInboxSubFilter('mentions');
              setActiveChannelFilter(null);
              setActiveTagFilter(null);
              setActiveTeamFilter(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${inboxSubFilter === 'mentions' ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-150/40 dark:hover:bg-slate-800/30'}`}
          >
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-amber-500" />
              <span>Menciones internas</span>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full font-black text-[9px]">Avisos</span>
          </button>

          <button 
            onClick={() => {
              setInboxSubFilter('unassigned');
              setActiveChannelFilter(null);
              setActiveTagFilter(null);
              setActiveTeamFilter(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${inboxSubFilter === 'unassigned' ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-150/40 dark:hover:bg-slate-800/30'}`}
          >
            <div className="flex items-center gap-2">
              <HelpCircle size={13} />
              <span>Sin Asignar</span>
            </div>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-1 rounded-md font-bold text-slate-500">{totalUnassigned}</span>
          </button>

          <button 
            onClick={() => {
              setInboxSubFilter('resolved');
              setActiveChannelFilter(null);
              setActiveTagFilter(null);
              setActiveTeamFilter(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${inboxSubFilter === 'resolved' ? 'bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 font-black' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-150/40 dark:hover:bg-slate-800/30'}`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>Resueltos</span>
            </div>
          </button>
        </div>

        {/* Teams Section */}
        <div className="mb-5">
          <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] px-2.5 mb-2.5">Equipos</p>
          <div className="space-y-0.5">
            {[
              { id: 'sales', label: "ventas_latam", color: "text-emerald-500" },
              { id: 'ops', label: "operaciones_crm", color: "text-amber-500" },
              { id: 'support', label: "soporte_bilingue", color: "text-blue-500 animate-pulse" }
            ].map(team => (
              <button
                key={team.id}
                onClick={() => {
                  setActiveTeamFilter(team.id);
                  setActiveChannelFilter(null);
                  setActiveTagFilter(null);
                  setInboxSubFilter('all');
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold ${activeTeamFilter === team.id ? 'bg-slate-200/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${team.id === 'sales' ? 'bg-emerald-500' : team.id === 'ops' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <span className="truncate">💼 {team.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Channels / Inboxes Section */}
        <div className="mb-5">
          <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] px-2.5 mb-2.5">Bandejas de entrada</p>
          <div className="space-y-0.5">
            {[
              { id: 'Web Chat', label: 'PaperLayer Sitio Web', icon: <Globe size={11} className="text-indigo-500" /> },
              { id: 'WhatsApp', label: 'PaperLayer Celular API', icon: <MessageCircle size={11} className="text-emerald-500" /> },
              { id: 'Email', label: 'PaperLayer Correo', icon: <Mail size={11} className="text-amber-500" /> },
              { id: 'Instagram', label: 'PaperLayer Instagram', icon: <Instagram size={11} className="text-pink-500" /> },
              { id: 'Facebook', label: 'PaperLayer Facebook', icon: <Facebook size={11} className="text-blue-600" /> },
            ].map((inb) => (
              <button
                key={inb.id}
                onClick={() => {
                  setActiveChannelFilter(inb.id);
                  setActiveTagFilter(null);
                  setActiveTeamFilter(null);
                  setInboxSubFilter('all');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-semibold ${activeChannelFilter === inb.id ? 'bg-slate-200/50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {inb.icon}
                  <span className="truncate">{inb.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Labels Section */}
        <div>
          <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] px-2.5 mb-2.5">Etiquetas activas</p>
          <div className="space-y-0.5">
            {['Premium', 'VIP', 'Seguimiento', 'Demo agendada', 'Contrato enviado', 'Urgente', 'Requiere soporte'].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setActiveTagFilter(tag);
                  setActiveChannelFilter(null);
                  setActiveTeamFilter(null);
                  setInboxSubFilter('all');
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-semibold ${activeTagFilter === tag ? 'bg-blue-50 border-l-2 border-blue-600 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200'}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag size={10} className="opacity-70 text-blue-500" />
                  <span className="truncate">{tag}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. COLUMN 2: CONVERSATIONAL QUEUE (Mid List Selector) */}
      <div className={`${showMobileList ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-80 shrink-0 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800/80`}>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-[#111827] space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Chats</h1>
              <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                {filteredConversations.length}
              </span>
            </div>
            
            {/* Quick reset of channel/tag filters */}
            {(activeChannelFilter || activeTagFilter || activeTeamFilter || inboxSubFilter !== 'all') && (
              <button 
                onClick={() => {
                  setActiveChannelFilter(null);
                  setActiveTagFilter(null);
                  setActiveTeamFilter(null);
                  setInboxSubFilter('all');
                }}
                className="text-[10px] font-black uppercase text-blue-600 hover:underline"
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          <div className="relative">
            <Search size={14} className="absolute inset-y-0 left-3 flex items-center h-full text-slate-400 font-bold" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, empresa, texto..." 
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 outline-none dark:text-white transition-all placeholder:text-slate-400" 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"><X size={12}/></button>
            )}
          </div>

          {/* Quick Central Tabs (Mine / Unassigned / All) */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200/40 dark:border-slate-800">
             {[
               { id: 'Mine', label: 'Míos', count: totalMine },
               { id: 'Unassigned', label: 'Sin asignar', count: totalUnassigned },
               { id: 'All', label: 'Todos', count: totalAllOpen }
             ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 text-[10px] font-black tracking-wide uppercase py-1.5 rounded-lg transition-all relative ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                >
                  <span className="z-10 relative">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`ml-1 px-1 rounded text-[8px] ${activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>{tab.count}</span>
                  )}
                </button>
             ))}
          </div>
        </div>

        {/* Scrolable conversations feed */}
        <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-850/50">
          {filteredConversations.length === 0 ? (
            <div className="p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto opacity-40">
                <Sliders size={18} className="text-slate-400" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sin chats coincidentes</p>
                <p className="text-[10px] text-slate-500 mt-1">Prueba a borrar filtros o cambiar los términos de búsqueda.</p>
              </div>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const convContact = state.contacts.find(c => c.id === conv.contactId);
              const lastMsg = conv.messages[conv.messages.length - 1];
              const isSelected = selectedConvId === conv.id;
              
              return (
                <div 
                  key={conv.id}
                  onClick={() => {
                     setSelectedConvId(conv.id);
                     setShowMobileList(false);
                  }}
                  className={`px-4 py-3.5 flex flex-col gap-2.5 cursor-pointer transition-all border-l-4 ${
                    isSelected 
                      ? 'bg-blue-50/40 dark:bg-blue-900/10 border-blue-600 dark:border-blue-500 shadow-[inset_0_1px_4px_rgba(0,0,0,0.01)]' 
                      : 'border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-505 tracking-widest flex items-center gap-1">
                      {channelIcons[conv.channel]}
                      {channelLabels[conv.channel]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        conv.ia_activa !== false
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-slate-150 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${conv.ia_activa !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {conv.ia_activa !== false ? 'IA Activa' : 'IA Detenida'}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400">1h</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="relative shrink-0">
                      <Avatar name={`${convContact?.firstName} ${convContact?.lastName}`} size="md" className="ring-2 ring-slate-100 dark:ring-slate-800" />
                      {conv.status === 'En espera' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className={`text-xs font-black truncate tracking-tight transition-colors ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-200'}`}>
                          {convContact?.firstName} {convContact?.lastName}
                        </h4>
                        
                        {conv.priority && (
                          <span className={`text-[8px] px-1.5 py-0.5 font-bold uppercase rounded ${
                            conv.priority === 'Alta' ? 'bg-red-500/10 text-red-500' : conv.priority === 'Media' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {conv.priority}
                          </span>
                        )}
                      </div>
                      
                      <p className={`text-xs truncate ${isSelected ? 'text-slate-750 dark:text-slate-300' : 'text-slate-450 dark:text-slate-400'}`}>
                        {lastMsg ? (lastMsg.isInternal ? '📝 [Interna] ' : '') + lastMsg.content : 'Formulario completado • Sin mensajes'}
                      </p>
                    </div>
                  </div>

                  {/* High Quality tags list beneath each item card */}
                  {convContact?.tags && convContact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-11">
                      {convContact.tags.slice(0, 3).map((tag, idx) => (
                        <span 
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTagFilter(tag);
                          }}
                          className="bg-slate-100 hover:bg-blue-100/45 dark:bg-slate-850/70 hover:dark:bg-blue-950/20 text-slate-500 hover:text-blue-600 dark:text-slate-400 text-[8px] px-1.5 py-0.5 rounded transition-all font-bold uppercase tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. COLUMN 3: MAIN CHAT FEED / WORKSTATION (Middle panel) */}
      <div className={`${!showMobileList ? 'flex' : 'hidden'} md:flex flex-col flex-1 bg-[#F8FAFC] dark:bg-[#0B0F19] transition-all overflow-hidden`}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-slate-200/50 dark:border-slate-800 p-4 px-6 flex items-center justify-between shrink-0 bg-white dark:bg-[#111827]">
              <div className="flex items-center gap-3.5">
                <button onClick={() => setShowMobileList(true)} className="md:hidden text-slate-500 hover:text-blue-500 transition-colors"><ArrowLeft size={18}/></button>
                <div className="relative">
                  <Avatar name={`${contact?.firstName} ${contact?.lastName}`} size="md" className="ring-2 ring-slate-100 dark:ring-slate-800 shadow" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#111827]"></div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black dark:text-white truncate tracking-tight text-slate-900">{contact?.firstName} {contact?.lastName}</h3>
                    {contact?.role && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">• {contact.role}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      {channelIcons[selectedConv.channel]} {channelLabels[selectedConv.channel]}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-[9px] font-black text-emerald-500 uppercase flex items-center">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1"></span>
                       En Línea
                    </span>
                  </div>
                </div>
              </div>

              {/* Chatwoot resolution buttons */}
              <div className="flex items-center gap-2">
                 <button 
                  onClick={() => setShowProfile(!showProfile)}
                  title="Detalles"
                  className={`p-2 transition-all rounded-xl border ${showProfile ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/45 dark:border-blue-800/60 dark:text-blue-400' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-250 border-slate-205 dark:border-slate-805 hover:bg-slate-105 dark:hover:bg-slate-805/50 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                 >
                   <Info size={16}/>
                 </button>

                  <button
                    onClick={() => {
                      const updatedConv: Conversation = {
                        ...selectedConv,
                        ia_activa: selectedConv.ia_activa === false ? true : false
                      };
                      dispatch({ type: 'UPDATE_CONVERSATION', payload: updatedConv });
                    }}
                    title={selectedConv.ia_activa === false ? "Activar Agente IA" : "Pausar Agente IA (Atención Humana)"}
                    className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm cursor-pointer ${
                      selectedConv.ia_activa === false
                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                        : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${selectedConv.ia_activa === false ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                    <span>{selectedConv.ia_activa === false ? 'IA Pausada' : 'IA Activa'}</span>
                  </button>

                 <button 
                   onClick={handleToggleStatus}
                   className={`h-9 px-4 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm ${
                     selectedConv.status === 'Resuelta'
                       ? 'bg-purple-150 border border-purple-200 text-purple-600 dark:bg-purple-950/30 dark:border-purple-900 dark:text-purple-400'
                       : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
                   }`}
                 >
                   {selectedConv.status === 'Resuelta' ? (
                     <>
                       <RefreshCw size={13} className="animate-spin" />
                       <span>Reabrir</span>
                     </>
                   ) : (
                     <>
                       <Check size={13} />
                       <span>Resolver</span>
                     </>
                   )}
                 </button>
              </div>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-[#FAFBFD] dark:bg-[#0B0F19]">
               {selectedConv.messages.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-40 space-y-5">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center animate-pulse">
                      <MessageSquare size={30} className="text-slate-400" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Inicio del ticket</p>
                      <p className="text-[10px] text-slate-505 dark:text-slate-405 leading-relaxed">No hay mensajes recientes en esta conversación. <br/>Envía un mensaje o escribe una nota para tu equipo.</p>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-5">
                    {/* Chatwoot Timeline Events */}
                    <div className="flex items-center justify-center gap-3 opacity-60">
                      <div className="h-[1px] bg-slate-200 dark:bg-slate-800 flex-1"></div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inicio del canal • {channelLabels[selectedConv.channel]}</span>
                      <div className="h-[1px] bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    </div>

                    {selectedConv.messages.map((msg, i) => {
                       const isSystem = msg.sender === 'Sistema';
                       const isUserReply = msg.sender !== 'Sistema' && msg.sender !== `${contact?.firstName} ${contact?.lastName}`;

                       if (isSystem) {
                         return (
                           <div key={msg.id} className="flex justify-center my-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wide">
                             <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/50 px-3 py-1 rounded-full text-center max-w-sm shrink-0">
                               <Activity size={10} className="text-blue-500" />
                               <span>El {msg.content}</span>
                             </div>
                           </div>
                         );
                       }
                       
                       if (msg.isInternal) {
                         return (
                           <div key={msg.id} className="flex justify-center my-4">
                             <div className="bg-[#FFF9E6] dark:bg-orange-950/25 border border-[#FFF1C2] dark:border-orange-900/35 rounded-2xl px-5 py-3 flex items-start gap-3 shadow-none max-w-lg w-full">
                                <Lock size={13} className="text-amber-500 mt-1 shrink-0" />
                                <div className="space-y-0.5">
                                   <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Nota interna • {msg.sender}</p>
                                   <span className="text-xs font-semibold text-amber-900/80 dark:text-orange-200/80 leading-relaxed">{msg.content}</span>
                                </div>
                             </div>
                           </div>
                         );
                       }

                       return (
                         <div key={msg.id} className={`flex flex-col ${isUserReply ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}>
                           <div className="flex items-center gap-2 mb-1 opacity-70">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{msg.sender}</span>
                             <span className="text-slate-300 dark:text-slate-700">•</span>
                             <span className="text-[9px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                           </div>

                           <div className={`max-w-[70%] rounded-2xl px-4 py-3 relative group shadow-sm ${
                             isUserReply 
                               ? 'bg-blue-600 text-white rounded-tr-none' 
                               : 'bg-white dark:bg-[#111827] text-slate-800 dark:text-white border border-slate-100 dark:border-slate-800 rounded-tl-none'
                           }`}>
                             <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{msg.content}</p>
                             
                             {isUserReply && (
                               <div className="flex justify-end mt-1.5">
                                 <CheckCheck size={12} className="text-blue-200" />
                               </div>
                             )}
                           </div>
                         </div>
                       );
                    })}
                    <div ref={chatBottomRef} />
                 </div>
               )}
            </div>

            {/* Canned Responses helper box */}
            {showCannedList && (
              <div className="mx-6 mt-2 p-3 bg-white dark:bg-[#111827] border border-slate-205 dark:border-slate-800 rounded-2xl shadow-xl space-y-2 animate-in slide-in-from-bottom-2 duration-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">⚡ Respuestas rápidas (Spanish Canned Responses)</p>
                <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1">
                  {CANNED_RESPONSES.map((txt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setMessage(txt);
                        setShowCannedList(false);
                      }}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 text-[11px] font-medium text-slate-600 dark:text-slate-300 transition-all border border-transparent hover:border-slate-100"
                    >
                      {txt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Composer Panel */}
            <div className="p-4 border-t border-slate-200/50 dark:border-slate-850 bg-white dark:bg-[#111827] shrink-0">
              
              {/* Reply style selector (Public vs Internal tabs) */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl mb-3 w-fit shadow-inner border border-slate-200/20 dark:border-slate-800">
                <button 
                  onClick={() => setIsInternalNote(false)}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${!isInternalNote ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <MessageSquare size={10} className="text-blue-500" /> 
                  <span>Respuesta pública</span>
                </button>
                <button 
                  onClick={() => setIsInternalNote(true)}
                  className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${isInternalNote ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <Lock size={10} className={isInternalNote ? "text-white" : "text-amber-500"} /> 
                  <span>Nota privada</span>
                </button>
              </div>

              {/* Chatwoot-style Editor boundaries */}
              <form 
                onSubmit={(e) => handleSendMessage(e)} 
                className={`flex flex-col gap-2 p-3 rounded-2xl border-2 transition-all ${
                  isInternalNote 
                    ? 'bg-amber-50/10 border-amber-200/80 dark:bg-amber-950/5 dark:border-amber-900/60' 
                    : 'bg-slate-50 border-slate-100 focus-within:border-blue-600/45 focus-within:bg-white dark:bg-slate-900 dark:border-slate-800 dark:focus-within:bg-slate-900'
                }`}
              >
                {/* Editor Textarea */}
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    isInternalNote 
                      ? "Escribe una nota privada visible solo para el equipo..." 
                      : `Escribe o usa '/' para seleccionar plantillas...`
                  }
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none text-[12px] font-medium py-1.5 dark:text-white min-h-[50px] placeholder:text-slate-400"
                />

                {/* Simulated formatting tool belt from Chatwoot */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60 text-slate-400">
                   <div className="flex items-center gap-1 sm:gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => setShowCannedList(!showCannedList)}
                        className="px-2 py-1 bg-slate-150/50 hover:bg-slate-200/50 dark:bg-slate-800/50 dark:hover:bg-slate-705/50 rounded-lg text-[9px] font-black uppercase text-blue-600 tracking-wide transition-all"
                        title="Plantillas rápidas"
                      >
                        ⚡ Respuestas
                      </button>
                      <span className="text-slate-200 dark:text-slate-800">|</span>
                      
                      {/* Rich Text lookalikes */}
                      <button type="button" className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"><span className="font-extrabold text-[11px]">B</span></button>
                      <button type="button" className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded transition-all italic text-[11px]">I</button>
                      <button type="button" className="p-1.5 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"><FileText size={12} /></button>
                      
                      <span className="text-slate-200 dark:text-slate-800">|</span>
                      <button type="button" className="p-1.5 hover:text-slate-700 hover:bg-slate-100/50 rounded transition-all" title="Adjuntar archivos"><Paperclip size={13}/></button>
                      <button type="button" className="p-1.5 hover:text-slate-700 hover:bg-slate-100/50 rounded transition-all" title="Emojis"><Smile size={13}/></button>
                   </div>
                   
                   <div className="flex items-center gap-2">
                     <Button 
                       type="submit" 
                       disabled={!message.trim()} 
                       className={`h-9 px-5 group transition-all rounded-xl ${
                         isInternalNote 
                           ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10' 
                           : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10'
                       }`}
                     >
                        <span className="font-black text-[10px] uppercase tracking-[0.1em]">Enviar</span>
                        <Send size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform ml-1 shrink-0" />
                     </Button>
                   </div>
                </div>
              </form>
              <div className="flex justify-center mt-2.5">
                 <p className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest font-mono">Tip: Ctrl + Enter para enviar • / para respuestas rápidas</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-50/20 dark:bg-slate-900/10 p-6 text-center">
             <div className="relative">
                <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center shadow-md rotate-3 relative border border-slate-200/50 dark:border-slate-800">
                   <MessageSquare className="text-brand opacity-20" size={40} />
                </div>
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20 -rotate-3 animate-bounce">
                   <Send size={18} className="text-white" />
                </div>
             </div>
             <div className="max-w-md space-y-2">
                <h3 className="text-base font-black dark:text-white italic tracking-tighter uppercase">Estación de Soporte Telocalizo Chats</h3>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-relaxed">Telocalizo Chats organiza todos tus canales: WhatsApp, Email, Sitio Web e Instagram en una sola interfaz limpia de alto rendimiento.</p>
                <p className="text-[10px] text-brand font-bold uppercase tracking-widest mt-2">{`<< Seleccione una conversación de la izquierda >>`}</p>
             </div>
          </div>
        )}
      </div>

      {/* 4. COLUMN 4: ENTERPRISE ACTIONS & COLLAPSIBLES (Right panel) */}
      <AnimatePresence>
        {selectedConv && showProfile && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 290, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden xl:flex flex-col border-l border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-[#111827] shrink-0 overflow-y-auto custom-scrollbar transition-all"
          >
            {/* Panel Top Actions / Close Header button */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/60 shrink-0 border-t border-slate-100 dark:border-slate-800/30">
               <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">Hoja de Vida</span>
               <button 
                  onClick={() => setShowProfile(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-500/5 dark:hover:bg-red-500/10 transition-all cursor-pointer active:scale-90"
                  title="Cerrar Hoja de Vida"
               >
                  <X size={12} />
               </button>
            </div>

            {/* Header profile summary */}
            <div className="p-5 flex flex-col items-center text-center border-b border-slate-200/50 dark:border-slate-800/70 space-y-3">
               <Avatar name={`${contact?.firstName} ${contact?.lastName}`} size="lg" className="shadow-sm ring-4 ring-blue-500/5 transition-transform hover:scale-105 shrink-0" />
               <div className="space-y-0.5">
                 <h3 className="font-extrabold text-slate-900 dark:text-white leading-tight text-xs tracking-tight">{contact?.firstName} {contact?.lastName}</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{contact?.company}</p>
               </div>
               
               <div className="grid grid-cols-2 gap-2 w-full pt-1">
                  <Button 
                    onClick={() => handleNav('contacts')}
                    variant="outline" 
                    size="sm" 
                    className="font-black text-[9px] uppercase tracking-wider h-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    Ver Ficha
                  </Button>
                  <Button 
                    onClick={() => handleNav('pipeline')}
                    variant="primary" 
                    size="sm" 
                    className="font-black text-[9px] uppercase tracking-wider h-8 bg-slate-900 dark:bg-slate-200 dark:text-slate-900 rounded-lg text-white"
                  >
                    Oportunidad
                  </Button>
               </div>
            </div>

            {/* Collapsible Action Accordions */}
            <div className="flex-1 p-4 space-y-4">
              
               {/* 4.1 Contact Information fields */}
               <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden shadow-none bg-slate-50/20 dark:bg-slate-950/20">
                 <button 
                   onClick={() => setExpandedSections(prev => ({ ...prev, conversations: !prev.conversations }))}
                   className="w-full flex items-center justify-between p-3 font-semibold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150/40 dark:border-slate-800"
                 >
                   <span className="flex items-center gap-1.5"><UserIcon size={12}/> Información básica</span>
                   {expandedSections.conversations ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                 </button>
                 
                 {expandedSections.conversations && (
                   <div className="p-3 space-y-2.5 text-left text-xs">
                     <div className="space-y-0.5">
                       <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Email</p>
                       <p className="font-bold text-slate-700 dark:text-slate-200 truncate hover:text-blue-500 cursor-pointer">{contact?.email}</p>
                     </div>
                     <div className="space-y-0.5">
                       <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Celular / Whats</p>
                       <p className="font-bold text-slate-700 dark:text-emerald-400">{contact?.phone}</p>
                     </div>
                     <div className="space-y-0.5">
                       <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">Ubicación</p>
                       <p className="font-bold text-slate-700 dark:text-slate-200 truncate">{contact?.city}, {contact?.country}</p>
                     </div>
                   </div>
                 )}
               </div>

               {/* 4.2 Assigned Agent Selector (Interactive) */}
               <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden shadow-none bg-slate-50/20 dark:bg-slate-950/20">
                 <button 
                   onClick={() => setExpandedSections(prev => ({ ...prev, agent: !prev.agent }))}
                   className="w-full flex items-center justify-between p-3 font-semibold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150/40 dark:border-slate-800/80"
                 >
                   <span className="flex items-center gap-1.5"><Users2 size={12}/> Agente Asignado</span>
                   {expandedSections.agent ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                 </button>

                 {expandedSections.agent && (
                   <div className="p-3 space-y-3">
                     <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl p-2.5 shadow-sm">
                       <Avatar 
                         name={state.users.find(u => u.id === selectedConv.assignedTo)?.name || 'Sin Asignar'} 
                         size="sm" 
                       />
                       <div className="min-w-0">
                         <p className="text-[10px] text-slate-400 font-bold uppercase">Agente activo</p>
                         <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                           {state.users.find(u => u.id === selectedConv.assignedTo)?.name || 'Sin Asignar'}
                         </p>
                       </div>
                     </div>
                     
                     <div className="space-y-1">
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Asignación rápida:</p>
                       <div className="grid grid-cols-2 gap-1.5">
                         {state.users.map((u) => (
                           <button 
                             key={u.id}
                             onClick={() => handleAssignAgent(u.id)}
                             disabled={selectedConv.assignedTo === u.id}
                             className={`p-1.5 text-[9px] hover:text-white font-extrabold uppercase rounded-lg border transition-all truncate text-left flex items-center gap-1 ${
                               selectedConv.assignedTo === u.id 
                                 ? 'bg-blue-600 border-blue-600 text-white' 
                                 : 'bg-white border-slate-250/60 dark:bg-slate-905 dark:border-slate-800 text-slate-650 dark:text-slate-300 hover:bg-blue-600 hover:border-blue-650'
                             }`}
                           >
                             <Check size={9} className={selectedConv.assignedTo === u.id ? "opacity-100 shrink-0" : "opacity-0 shrink-0"} />
                             <span className="truncate">{u.name.split(' ')[0]}</span>
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>
                 )}
               </div>

               {/* 4.3 Assigned Team selector */}
               <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden shadow-none bg-slate-50/20 dark:bg-slate-950/20">
                 <button 
                   onClick={() => setExpandedSections(prev => ({ ...prev, team: !prev.team }))}
                   className="w-full flex items-center justify-between p-3 font-semibold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150/40 dark:border-slate-800/80"
                 >
                   <span className="flex items-center gap-1.5"><Briefcase size={12}/> Equipo de Ventas</span>
                   {expandedSections.team ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                 </button>

                 {expandedSections.team && (
                   <div className="p-3 text-xs space-y-2">
                     <p className="text-[10px] text-slate-405 dark:text-slate-350">Las transferencias de tickets re-rutean enrutamientos automáticos.</p>
                     <div className="flex flex-col gap-1.5">
                       {['ventas_latam', 'operaciones_crm', 'soporte_bilingue'].map((tm, key) => (
                         <div key={key} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300">
                           <span className="truncate">💼 {tm}</span>
                           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>

               {/* 4.4 Priority Selector */}
               <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden shadow-none bg-slate-50/20 dark:bg-slate-950/20">
                 <button 
                   onClick={() => setExpandedSections(prev => ({ ...prev, priority: !prev.priority }))}
                   className="w-full flex items-center justify-between p-3 font-semibold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150/40 dark:border-slate-800/80"
                 >
                   <span className="flex items-center gap-1.5"><AlertCircle size={12}/> Prioridad del Ticket</span>
                   {expandedSections.priority ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                 </button>

                 {expandedSections.priority && (
                   <div className="p-3 flex flex-col gap-1.5">
                     {[
                       { id: 'Alta', label: 'Alta', color: 'bg-red-500' },
                       { id: 'Media', label: 'Media', color: 'bg-amber-500' },
                       { id: 'Baja', label: 'Baja', color: 'bg-blue-500' }
                     ].map((item) => (
                       <button
                         key={item.id}
                         onClick={() => handleSetPriority(item.id as any)}
                         className={`w-full flex items-center justify-between p-2 text-[10px] font-black uppercase rounded-lg border transition-all ${
                           selectedConv.priority === item.id
                             ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-950/25 dark:text-blue-400'
                             : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 hover:bg-slate-50'
                         }`}
                       >
                         <div className="flex items-center gap-2">
                           <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                           <span>Prioridad {item.label}</span>
                         </div>
                         {selectedConv.priority === item.id && <Check size={11} />}
                       </button>
                     ))}
                   </div>
                 )}
               </div>

               {/* 4.5 Conversation Labels with Live Creation & Removal callbacks */}
               <div className="border border-slate-100 dark:border-slate-850 rounded-xl overflow-hidden shadow-none bg-slate-50/20 dark:bg-slate-950/20">
                 <button 
                   onClick={() => setExpandedSections(prev => ({ ...prev, labels: !prev.labels }))}
                   className="w-full flex items-center justify-between p-3 font-semibold text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-150/40 dark:border-slate-800/80"
                 >
                   <span className="flex items-center gap-1.5"><Tag size={12}/> Etiquetas del Cliente</span>
                   {expandedSections.labels ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                 </button>

                 {expandedSections.labels && (
                   <div className="p-3 space-y-3">
                     
                     {/* Add live tag form */}
                     <form onSubmit={handleAddTag} className="flex gap-1.5">
                       <input 
                         type="text" 
                         value={newTagInput}
                         onChange={(e) => setNewTagInput(e.target.value)}
                         placeholder="Nueva etiqueta..." 
                         className="flex-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none text-slate-800 dark:text-slate-100 focus:border-blue-500"
                       />
                       <button 
                         type="submit" 
                         className="px-2 py-1.5 bg-blue-600 hover:bg-blue-750 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                         title="Añadir"
                       >
                         <Plus size={13} />
                       </button>
                     </form>

                     <div className="flex flex-wrap gap-1.5">
                       {contact?.tags && contact.tags.length > 0 ? (
                         contact.tags.map((tag, i) => (
                           <div 
                             key={i} 
                             className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 text-slate-650 dark:text-slate-200 text-[9px] px-2 py-1 rounded-md border border-slate-200/40 dark:border-slate-800 font-extrabold uppercase tracking-wide"
                           >
                             <span>{tag}</span>
                             <button 
                               type="button" 
                               onClick={() => handleRemoveTag(tag)}
                               className="text-slate-400 hover:text-red-500 transition-colors"
                               title="Remover"
                             >
                               <X size={10} />
                             </button>
                           </div>
                         ))
                       ) : (
                         <span className="text-[10px] italic text-slate-400 p-2 font-bold uppercase">Sin etiquetas</span>
                       )}
                     </div>
                   </div>
                 )}
               </div>

            </div>

            {/* Simulated Active metrics footer */}
            <div className="p-4 bg-slate-50/50 dark:bg-[#0E1524] border-t border-slate-200/55 dark:border-slate-800/80 shrink-0 text-left text-[10px] font-medium text-slate-400 space-y-1">
               <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-wider">Metas y KPIs</span>
               <div className="flex items-center justify-between mt-1">
                 <span>Tiempo de respuesta avg</span>
                 <span className="font-bold text-slate-650 dark:text-slate-300">4m 12s</span>
               </div>
               <div className="flex items-center justify-between">
                 <span>Tasa de resolución</span>
                 <span className="font-bold text-slate-650 dark:text-slate-300">92.4%</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
