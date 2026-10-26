/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Case, Patient, AppNotification, ChatMessage } from './types';
import { initialCases, initialPatients, initialNotifications } from './mockData';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { Patients } from './components/Patients';
import { Calendar } from './components/Calendar';
import { Messages } from './components/Messages';
import { Scanner } from './components/Scanner';
import { Support } from './components/Support';
import { Wizard } from './components/Wizard';
import { CaseDetails } from './components/CaseDetails';
import { Payments } from './components/Payments';
import logoIcon from './assets/images/logo-icon.png';

import {
  LayoutDashboard,
  FileText,
  Send,
  MessageSquare,
  Users,
  Video,
  Settings,
  Bell,
  LogOut,
  Radio,
  Menu,
  Calendar as CalendarIcon,
  Check,
  UserCheck,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export default function App() {
  // Simulated Authentication state — start logged out so the login page is shown by default.
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  // Active Screen logic
  const [currentScreen, setCurrentScreen] = useState<string>('Dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // In-Memory Database
  const [cases, setCases] = useState<Case[]>(initialCases);
  // Keep a live ref to cases so async validation callbacks read the latest state.
  const casesRef = useRef(cases);
  casesRef.current = cases;
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);

  // Layout states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Inter-screen payload values
  const [supportAttachedCaseId, setSupportAttachedCaseId] = useState<string | null>(null);
  // Screen to return to after a video call ends (e.g. the wizard mid-registration).
  const [callReturnScreen, setCallReturnScreen] = useState<string | null>(null);
  const [wizardPrefilledDeliveryDate, setWizardPrefilledDeliveryDate] = useState<string | null>(null);
  const [selectedPatientForWizard, setSelectedPatientForWizard] = useState<Patient | null>(null);

  // ────────────────────────────────────────────────────────
  // DATABASE SYNCHRONIZERS
  // ────────────────────────────────────────────────────────

  const handleLogin = (doctorName: string, email: string) => {
    setUser({ name: doctorName, email });
    setCurrentScreen('Dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedCaseId(null);
  };

  // Switch Screens safely
  const handleNavigate = (screenName: string, caseId?: string) => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    // Any manual navigation cancels a pending auto-return from a video call.
    setCallReturnScreen(null);

    if (caseId) {
      setSelectedCaseId(caseId);
      setCurrentScreen('Casos'); // Navigate to detail-aware view
    } else {
      setSelectedCaseId(null);
      setCurrentScreen(screenName);
    }

    // Reset pre-fills unless intentional
    if (screenName !== 'Nuevo caso') {
      setSelectedPatientForWizard(null);
      setWizardPrefilledDeliveryDate(null);
    }
    if (screenName !== 'Soporte / Técnico en vivo') {
      setSupportAttachedCaseId(null);
    }
  };

  // Add Case
  const handleAddCase = (newCase: Case) => {
    setCases((prev) => [newCase, ...prev]);

    // Create positive notification
    const freshNotif: AppNotification = {
      id: 'N-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      text: `Tu caso ${newCase.id} para ${newCase.patientName} fue enviado con éxito.`,
      caseId: newCase.id,
      time: 'Hace unos instantes',
      read: false
    };

    setNotifications((prev) => [freshNotif, ...prev]);

    // Update patient record lastCaseId
    setPatients((prev) =>
      prev.map((p) =>
        p.name === newCase.patientName ? { ...p, lastCaseId: newCase.id } : p
      )
    );
  };

  // Mark a case as paid → enter validation, then the system "confirms" the deposit.
  const handleMarkAsPaid = (caseId: string) => {
    // Step 1: move to validation while the system checks the incoming transfer.
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId && c.paymentStatus !== 'pagado'
          ? { ...c, paymentStatus: 'en_validacion' }
          : c
      )
    );

    // Step 2: after the bank reconciliation simulation, confirm the payment —
    // unless it was rejected in the meantime (no longer 'en_validacion').
    setTimeout(() => {
      const target = casesRef.current.find((c) => c.id === caseId);
      if (!target || target.paymentStatus !== 'en_validacion') return;

      // Payment gate: a finished case (En producción) is only released to
      // delivery once the payment is confirmed.
      const releaseToDelivery = target.status === 'En producción';

      setCases((prev) =>
        prev.map((c) =>
          c.id === caseId && c.paymentStatus === 'en_validacion'
            ? { ...c, paymentStatus: 'pagado', ...(releaseToDelivery ? { status: 'En camino' } : {}) }
            : c
        )
      );

      const confirmNotif: AppNotification = {
        id: 'N-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        text: `Pago validado para el caso ${caseId} (${target.patientName}). El depósito fue confirmado.`,
        caseId,
        time: 'Hace unos instantes',
        read: false,
      };
      setNotifications((prev) => [confirmNotif, ...prev]);

      // Automatic shipment notification once paid & released.
      if (releaseToDelivery) {
        const shipNotif: AppNotification = {
          id: 'N-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          text: `¡Tu caso ${caseId} (${target.patientName}) salió a entrega! Llegada estimada: ${target.deliveryDate}.`,
          caseId,
          time: 'Hace unos instantes',
          read: false,
        };
        setNotifications((prev) => [shipNotif, ...prev]);
      }
    }, 3500);
  };

  // Simulate a rejected validation: the system did not find the deposit.
  const handleRejectPayment = (caseId: string) => {
    const target = casesRef.current.find((c) => c.id === caseId);
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, paymentStatus: 'pendiente' } : c))
    );

    const rejectNotif: AppNotification = {
      id: 'N-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      text: `No se encontró el depósito del caso ${caseId}${target ? ` (${target.patientName})` : ''}. El pago fue rechazado.`,
      caseId,
      time: 'Hace unos instantes',
      read: false,
    };
    setNotifications((prev) => [rejectNotif, ...prev]);
  };

  // Generic partial update of a case (instructions, files, cancel, design approval…)
  const handleUpdateCase = (caseId: string, partial: Partial<Case>) => {
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, ...partial } : c)));
  };

  // Update Case status or extra fields (Ratings, remakes, etc.)
  const handleUpdateCaseStatus = (caseId: string, status: Case['status'], extra?: any) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const updated = { ...c, status, ...extra };
          return updated;
        }
        return c;
      })
    );

    // If case has rating, notify success
    if (extra?.rating) {
      const ratingNotif: AppNotification = {
        id: 'N-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        text: `Calificaste el caso ${caseId} con ${extra.rating.score} estrellas.`,
        caseId,
        time: 'Hace un momento',
        read: false
      };
      setNotifications((prev) => [ratingNotif, ...prev]);
    }
  };

  // Settle Chat Message
  const handleAddChatMessage = (caseId: string, text: string) => {
    const timeFormatted = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const mockMsg: ChatMessage = {
      id: 'm-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      sender: text.startsWith('[AUTO-LAB]') ? 'lab' : 'doctor',
      text,
      time: timeFormatted,
    };

    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, chat: [...c.chat, mockMsg] } : c))
    );
  };

  // Register Patient
  const handleAddPatient = (newPatient: Patient) => {
    setPatients((prev) => [newPatient, ...prev]);
  };

  // Link Finished Videocall
  const handleAddCallSessionToCase = (caseId: string, session: any) => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, priorCalls: [session, ...c.priorCalls] } : c))
    );
  };

  const handleSelectPatientForNewCase = (patient: Patient) => {
    setSelectedPatientForWizard(patient);
    setCurrentScreen('Nuevo caso');
  };

  const handleSetWizardDeliveryDate = (dateString: string) => {
    setWizardPrefilledDeliveryDate(dateString);
  };

  // Instantly start live videocall from case details or the new-case wizard.
  // Remember the originating screen so we can return there once the call ends.
  const handleStartInstantVideocall = (caseId?: string) => {
    if (caseId) {
      setSupportAttachedCaseId(caseId);
    }
    setCallReturnScreen(currentScreen);
    setCurrentScreen('Soporte / Técnico en vivo');
  };

  // Called by Support once a call is finished & its record saved.
  const handleCallComplete = () => {
    const target = callReturnScreen;
    setCallReturnScreen(null);
    if (target && target !== 'Soporte / Técnico en vivo') {
      setCurrentScreen(target);
    }
  };

  // Notification count
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpenNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    // Mark as read after opening
    setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
  };

  // ────────────────────────────────────────────────────────
  // LAYOUT BUILDING
  // ────────────────────────────────────────────────────────

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Sidebar Menu Items definition
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Casos', icon: FileText },
    { name: 'Pagos', icon: Wallet },
    { name: 'Nuevo caso', icon: Send },
    { name: 'Mensajes', icon: MessageSquare },
    { name: 'Calendario', icon: CalendarIcon },
    { name: 'Escáner Nova Dental IOS', icon: Radio },
    { name: 'Pacientes', icon: Users },
    { name: 'Soporte / Técnico en vivo', icon: Video },
    { name: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5EFEB] text-[#2F4156] flex flex-col font-sans relative antialiased leading-normal">
      {/* HEADER BAR */}
      <header className="bg-white border-b border-[#C8D9E6]/60 h-16 px-4 md:px-6 flex items-center justify-between sticky top-0 z-45 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#2F4156] hover:bg-[#C8D9E6]/30 rounded-xl transition bg-transparent"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Main clinical logo brand */}
          <div
            onClick={() => handleNavigate('Dashboard')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <img src={logoIcon} alt="Nova Dental" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-extrabold text-sm md:text-base text-[#2F4156] tracking-tight block">Nova Dental</span>
              <span className="text-[9px] uppercase tracking-wider font-semibold text-[#567C8D] leading-none block">Portal Clínico Digital</span>
            </div>
          </div>
        </div>

        {/* Header Right utilities */}
        <div className="flex items-center gap-4 relative">
          {/* Notifications bell count */}
          <div className="relative">
            <button
              onClick={handleOpenNotifications}
              className="p-2 text-[#2F4156] hover:bg-[#C8D9E6]/25 rounded-xl transition bg-transparent relative outline-none"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-orange-600 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown notifications list */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#C8D9E6] shadow-xl overflow-hidden z-50 animate-fade-in" id="notification-dropdown">
                <div className="p-3 border-b border-[#C8D9E6]/40 bg-[#F5EFEB]/30 flex justify-between items-center">
                  <span className="font-bold text-xs text-[#2F4156]">Panel de Notificaciones</span>
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded">Al día</span>
                </div>
                <div className="divide-y divide-[#C8D9E6]/20 max-h-[300px] overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNavigate('Casos', notif.caseId)}
                      className="p-3.5 hover:bg-[#C8D9E6]/10 cursor-pointer transition text-xs space-y-1"
                    >
                      <p className="text-[#2F4156] leading-relaxed font-semibold">{notif.text}</p>
                      <span className="text-[10px] text-[#2F4156]/50 font-mono block">{notif.time}</span>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="p-6 text-center text-[#2F4156]/40 italic">
                      No hay notificaciones registradas.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Doctor name card description */}
          <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-[#C8D9E6]/50 select-none">
            <div className="p-1 px-2.5 bg-[#F5EFEB] rounded-xl font-bold text-xs text-[#2F4156]">
              {user.name}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition bg-transparent border-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CORE SPLIT SCREEN BOARD: SIDEBAR + VIEWPORT */}
      <div className="flex-1 flex pointer-events-auto relative">
        {/* DESKTOP FIXED SIDEBAR (collapsible) */}
        <aside className={`hidden md:flex flex-col bg-[#2F4156] text-white flex-shrink-0 border-r border-[#C8D9E6]/10 relative select-none transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
          {/* Collapse / expand toggle */}
          <div className={`pt-4 px-3 flex ${sidebarCollapsed ? 'justify-center' : 'justify-end'}`}>
            <button
              onClick={() => setSidebarCollapsed((v) => !v)}
              title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
              className="p-2 rounded-xl text-[#C8D9E6] hover:bg-[#C8D9E6]/20 hover:text-white transition bg-transparent border-0"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>

          <div className={`flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-180px)] ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.name;
              return (
                <button
                  key={item.name}
                  id={`nav-item-${item.name.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => handleNavigate(item.name)}
                  title={sidebarCollapsed ? item.name : undefined}
                  className={`w-full flex items-center gap-3 py-3 rounded-xl text-xs font-semibold text-left transition-all ${
                    sidebarCollapsed ? 'justify-center px-0' : 'px-4'
                  } ${
                    isActive
                      ? 'bg-[#567C8D] text-white shadow-md'
                      : 'hover:bg-[#C8D9E6]/20 text-[#C8D9E6] hover:text-white'
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                </button>
              );
            })}
          </div>

          {/* Bottom Sidebar Brand Certificate */}
          <div className={`border-t border-white/5 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`bg-white/5 rounded-xl border border-white/5 flex items-center ${sidebarCollapsed ? 'p-2 justify-center' : 'p-3 gap-2.5'}`} title={sidebarCollapsed ? user.email : undefined}>
              <UserCheck className="w-5 h-5 text-[#C8D9E6] flex-shrink-0" />
              {!sidebarCollapsed && (
                <div className="text-[10px] leading-tight">
                  <span className="font-bold block text-[#C8D9E6]">Doctor Conectado</span>
                  <span className="text-white/60 truncate block max-w-[130px]">{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* MOBILE RESPONSE SLIDEOUT DRAWER MENU */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm pointer-events-auto md:hidden" onClick={() => setMobileMenuOpen(false)}>
            <aside
              className="w-64 bg-[#2F4156] h-full flex flex-col pointer-events-auto animate-fade-in text-white p-4 space-y-2 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
                <span className="font-bold text-[#C8D9E6] text-sm">Menú Portal Dental</span>
                <button onClick={() => setMobileMenuOpen(false)} className="bg-transparent border-0 text-white font-bold p-1">
                  ✕
                </button>
              </div>

              <div className="space-y-1.5 flex-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigate(item.name)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold text-left transition-all ${
                        isActive
                          ? 'bg-[#567C8D] text-white shadow-sm'
                          : 'hover:bg-[#C8D9E6]/20 text-[#C8D9E6]'
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5" />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        {/* MAIN VIEWPORT BODY CONTAINER */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-full relative z-10 select-text">
          {/* ────────────────────────────────────────────────────────
              RENDER ACTIVE SCREEN STATE SWITCH
              ──────────────────────────────────────────────────────── */}
          
          {/* SCREEN: DASHBOARD */}
          {currentScreen === 'Dashboard' && (
            <Dashboard
              cases={cases}
              onNavigate={handleNavigate}
              doctorName={user.name}
            />
          )}

          {/* SCREEN: CASOS GENERAL LIST INDEX (Also handles Detail view inside if selectedCaseId populated) */}
          {currentScreen === 'Casos' && (
            selectedCaseId ? (
              <CaseDetails
                caseItem={cases.find((c) => c.id === selectedCaseId) || cases[0]}
                onNavigateBack={() => setSelectedCaseId(null)}
                onUpdateCaseStatus={handleUpdateCaseStatus}
                onUpdateCase={handleUpdateCase}
                onAddChatMessage={handleAddChatMessage}
                onStartSupportCall={handleStartInstantVideocall}
                onMarkAsPaid={handleMarkAsPaid}
                onRejectPayment={handleRejectPayment}
              />
            ) : (
              /* Case index component styled here with full filters list */
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-[#2F4156]">Registro General de Órdenes Médicas</h1>
                  <p className="text-sm text-[#2F4156]/70 mt-1">Busque, filtre y gestione todas sus directivas de laboratorios.</p>
                </div>

                <div className="bg-white rounded-2xl border border-[#C8D9E6]/50 shadow-sm overflow-hidden p-4">
                  {/* Case Listing Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#C8D9E6]/40 text-xs text-[#2F4156]/70 uppercase font-semibold bg-[#F5EFEB]/40">
                          <th className="py-3 px-4">Código / Caso</th>
                          <th className="py-3 px-4">Paciente</th>
                          <th className="py-3 px-4">Indicación / Producto</th>
                          <th className="py-3 px-4">Precio</th>
                          <th className="py-3 px-4">Piezas FDI</th>
                          <th className="py-3 px-4">F. Envío</th>
                          <th className="py-3 px-4">F. Entrega</th>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4 text-right">Ficha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#C8D9E6]/25">
                        {cases.map((c) => {
                          const isUrgent = c.urgency === 'express';
                          return (
                            <tr key={c.id} className="hover:bg-[#C8D9E6]/10 transition-colors">
                              <td className="py-3.5 px-4">
                                <span className="font-mono text-xs font-bold text-[#567C8D]">{c.id}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-[#2F4156]">{c.patientName}</span>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-semibold text-[#2F4156]/80">
                                {c.product}
                              </td>
                              <td className="py-3.5 px-4 text-xs font-mono font-bold text-[#2F4156]">
                                {c.price != null ? `S/ ${c.price.toFixed(2)}` : '—'}
                              </td>
                              <td className="py-3.5 px-4 text-xs font-mono font-bold">
                                FDI: {c.teeth.join(', ')}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-[#2F4156]/60 font-mono">
                                {c.sentDate}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-[#2F4156]/70 font-mono font-bold">
                                {c.deliveryDate}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F5EFEB] text-[#2F4156] border border-[#C8D9E6]`}>
                                    {c.status}
                                  </span>
                                  {isUrgent && (
                                    <span className="bg-orange-600 text-white text-[9px] font-black tracking-widest px-1.5 rounded animate-pulse">
                                      URGENTE
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => handleNavigate('Casos', c.id)}
                                  className="p-1 px-3 bg-[#2F4156] hover:bg-[#567C8D] text-white text-xs font-bold rounded-lg transition"
                                >
                                  Detalles
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )}

          {/* SCREEN: PAGOS */}
          {currentScreen === 'Pagos' && (
            <Payments
              cases={cases}
              onMarkAsPaid={handleMarkAsPaid}
              onRejectPayment={handleRejectPayment}
              onNavigate={handleNavigate}
            />
          )}

          {/* SCREEN: NUEVO CASO WIZARD
              Kept mounted (hidden) while a video call launched from the wizard is
              in progress, so the in-flight case registration is preserved. */}
          {(currentScreen === 'Nuevo caso' ||
            (currentScreen === 'Soporte / Técnico en vivo' && callReturnScreen === 'Nuevo caso')) && (
            <div className={currentScreen === 'Nuevo caso' ? '' : 'hidden'}>
              <Wizard
                patients={patients}
                cases={cases}
                onAddCase={handleAddCase}
                onNavigate={handleNavigate}
                onStartInstantVideocall={handleStartInstantVideocall}
                selectedPatientFromOtherView={selectedPatientForWizard}
                wizardPrefilledDeliveryDate={wizardPrefilledDeliveryDate}
              />
            </div>
          )}

          {/* SCREEN: MENSAJES INBOX */}
          {currentScreen === 'Mensajes' && (
            <Messages
              cases={cases}
              onNavigate={handleNavigate}
              onSendMessage={handleAddChatMessage}
            />
          )}

          {/* SCREEN: CALENDARIO */}
          {currentScreen === 'Calendario' && (
            <Calendar
              cases={cases}
              onNavigate={handleNavigate}
              onSetWizardDeliveryDate={handleSetWizardDeliveryDate}
            />
          )}

          {/* SCREEN: SCANNED DEVICE INFO */}
          {currentScreen === 'Escáner Nova Dental IOS' && (
            <Scanner />
          )}

          {/* SCREEN: PATIENTS INDEX */}
          {currentScreen === 'Pacientes' && (
            <Patients
              patients={patients}
              cases={cases}
              onNavigate={handleNavigate}
              onSelectPatientForNewCase={handleSelectPatientForNewCase}
              onAddPatient={handleAddPatient}
            />
          )}

          {/* SCREEN: LIVE TECH CHAIRSIDE HELP CALL */}
          {currentScreen === 'Soporte / Técnico en vivo' && (
            <Support
              cases={cases}
              onNavigate={handleNavigate}
              attachedCaseId={supportAttachedCaseId}
              onAddCallSessionToCase={handleAddCallSessionToCase}
              onCallComplete={handleCallComplete}
              returnLabel={callReturnScreen === 'Nuevo caso' ? 'Volver al registro del caso' : null}
            />
          )}

          {/* SCREEN: CONFIGURATION */}
          {currentScreen === 'Configuración' && (
            <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm space-y-6 max-w-xl text-left" id="settings-view">
              <div className="border-b border-[#C8D9E6]/30 pb-3">
                <h2 className="text-lg font-bold text-[#2F4156]">Configuración de Cuenta Médica</h2>
                <p className="text-xs text-[#2F4156]/60">Gestione privilegios, credenciales sincronizadas y licencias CAD.</p>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#2F4156]/60 uppercase tracking-widest text-[9px] mb-1">Nombre del Colegiado</label>
                    <input type="text" readOnly value="Dr. García Ramos" className="w-full p-2.5 bg-[#F5EFEB]/30 border border-[#C8D9E6] rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[#2F4156]/60 uppercase tracking-widest text-[9px] mb-1">Número de COP (Colegio de Odontólogos del Perú)</label>
                    <input type="text" readOnly value="COP 12042" className="w-full p-2.5 bg-[#F5EFEB]/30 border border-[#C8D9E6] rounded-xl outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[#2F4156]/60 uppercase tracking-widest text-[9px] mb-1">Clínica Odontológica Registrada</label>
                  <input type="text" readOnly value="Clínica Dental San Borja — Lima" className="w-full p-2.5 bg-[#F5EFEB]/30 border border-[#C8D9E6] rounded-xl outline-none" />
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-extrabold text-[#2F4156] block text-xs">Sincronización Clínica Activa</span>
                    <p className="text-[10px] text-emerald-900/80">
                      Su cuenta se encuentra homologada con la red del laboratorio dental central de Nova Dental, permitiendo derivaciones automatizadas en tiempo real.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
