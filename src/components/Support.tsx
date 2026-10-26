/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Technician, Case, VideoCallSession } from '../types';
import { initialTechnicians } from '../mockData';
import {
  Phone,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Camera,
  PenTool,
  X,
  UserCheck,
  ShieldAlert,
  Star,
  Info,
  Calendar,
  Layers,
  MessageSquare,
  Sparkles,
  CheckCircle
} from 'lucide-react';

interface SupportProps {
  cases: Case[];
  technicians?: Technician[];
  onNavigate: (screen: string, caseId?: string) => void;
  attachedCaseId?: string | null;
  onAddCallSessionToCase: (caseId: string, session: VideoCallSession) => void;
  onCallComplete?: () => void;
  returnLabel?: string | null;
}

export const Support: React.FC<SupportProps> = ({
  cases,
  technicians = initialTechnicians,
  onNavigate,
  attachedCaseId = null,
  onAddCallSessionToCase,
  onCallComplete,
  returnLabel = null,
}) => {
  const [activeView, setActiveView] = useState<'index' | 'lobby' | 'incall' | 'postcall'>('index');
  const [assignedTech, setAssignedTech] = useState<Technician>(technicians[0]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(attachedCaseId || '');
  
  // In-call States
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'doc' | 'tech'; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  
  // Snapshot / Annotation tool states
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<'circle' | 'arrow' | 'text' | null>(null);
  const [annotations, setAnnotations] = useState<Array<{ type: 'circle' | 'arrow' | 'text'; x: number; y: number; text?: string; color: string }>>([]);
  const [customText, setCustomText] = useState('Ver margen');

  // Post-call states
  const [rating, setRating] = useState(5);
  const [sessionNotes, setSessionNotes] = useState('Revisión interactiva del modelo 3D. El doctor aclara el margen en distal.');

  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const techSpeakingRef = useRef<boolean>(true);
  const [techSpeaking, setTechSpeaking] = useState(true);

  // Auto assign attached case if available
  useEffect(() => {
    if (attachedCaseId) {
      setSelectedCaseId(attachedCaseId);
      setActiveView('lobby'); // Go straight to connecting lobby if we click call from details case
    }
  }, [attachedCaseId]);

  // In-Call Timer and simulated tech talking status
  useEffect(() => {
    if (activeView === 'incall') {
      setTimerSeconds(0);
      callTimerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
        
        // Randomly simulate technician "speaking border"
        if (Math.random() > 0.7) {
          setTechSpeaking((prev) => !prev);
        }
      }, 1000);

      // Seed chat messages
      setChatMessages([
        { sender: 'tech', text: '¡Hola Dr. García! Gusto en verle. ¿En qué le puedo asistir sobre este caso?', time: '00:02' }
      ]);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    }

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [activeView]);

  // Automatically add a technician message after doctor posts a chat block in-call
  const handleSendChatInCall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const docTime = formatCallTime(timerSeconds);
    const newMsgs = [...chatMessages, { sender: 'doc', text: chatInput.trim(), time: docTime }];
    setChatMessages(newMsgs);
    setChatInput('');

    // Tech replies in 1sec
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'tech',
          text: 'Perfecto doctor, acabo de activar las marcaciones en mi pantalla clínica CAD/CAM. Dibujaré la flecha de socavado.',
          time: formatCallTime(timerSeconds + 1),
        },
      ]);
      // Auto add a mock circle annotation for premium click
      setAnnotations((prev) => [
        ...prev,
        { type: 'circle', x: 140, y: 110, color: '#F97316' }
      ]);
    }, 1000);
  };

  // Lobby Loading Redirect
  useEffect(() => {
    if (activeView === 'lobby') {
      const wait = setTimeout(() => {
        setActiveView('incall');
      }, 2500); // Wait 2.5sec on Connecting spinner
      return () => clearTimeout(wait);
    }
  }, [activeView]);

  const handleStartCall = (tech: Technician) => {
    setAssignedTech(tech);
    setActiveView('lobby');
  };

  const handleFinishCall = () => {
    setActiveView('postcall');
  };

  const submitPostCall = () => {
    // Save session in case list
    if (selectedCaseId) {
      const finalSession: VideoCallSession = {
        id: 'CALL-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        caseId: selectedCaseId,
        caseName: cases.find(c => c.id === selectedCaseId)?.caseName || 'CONSULTA-GENERAL',
        date: new Date().toISOString().split('T')[0],
        duration: formatCallTime(timerSeconds),
        technician: assignedTech.name,
        notes: sessionNotes,
        snapshots: snapshots.length > 0 ? snapshots : ['/snap_session.png'],
      };

      onAddCallSessionToCase(selectedCaseId, finalSession);
    }

    // Reset details and go home
    setActiveView('index');
    setSnapshots([]);
    setAnnotations([]);
    setSelectedCaseId('');

    // If the call was launched from another flow (e.g. the new-case wizard),
    // hand control back so the user resumes where they left off.
    onCallComplete?.();
  };

  const formatCallTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setAnnotations((prev) => [
      ...prev,
      {
        type: activeTool,
        x,
        y,
        text: activeTool === 'text' ? customText : undefined,
        color: activeTool === 'circle' ? '#EF4444' : '#F59E0B',
      },
    ]);
  };

  const takeSnapshot = () => {
    const freshSnap = `SNAP-${snapshots.length + 1}-${Date.now()}.png`;
    setSnapshots((prev) => [...prev, freshSnap]);
  };

  const selectedCaseObj = cases.find((c) => c.id === selectedCaseId);

  return (
    <div className="space-y-6" id="support-live-module">
      {/* ────────────────────────────────────────────────────────
          STATE: LOBBY (WAITING ROOM)
          ──────────────────────────────────────────────────────── */}
      {activeView === 'lobby' && (
        <div className="bg-white p-8 rounded-2xl border border-[#C8D9E6]/50 shadow-lg max-w-lg mx-auto text-center space-y-6" id="lobby-view">
          <div className="flex justify-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-[#C8D9E6]/30 rounded-full animate-pulse" />
              <div className="absolute inset-x-0 inset-y-0 border-4 border-t-transparent border-[#567C8D] rounded-full animate-spin" />
              <Video className="w-10 h-10 text-[#2F4156] animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#2F4156]">Enlazando con el Laboratorio...</h2>
            <p className="text-sm text-[#2F4156]/70 max-w-sm mx-auto">
              Se está abriendo una videoconsulta cifrada para soporte clínico clínico en tiempo real.
            </p>
          </div>

          {/* Assigned Technician Card */}
          <div className="p-4 bg-[#F5EFEB] border border-[#C8D9E6]/40 rounded-xl max-w-sm mx-auto flex items-center gap-4 text-left">
            <span className={`w-12 h-12 rounded-full bg-gradient-to-tr ${assignedTech.avatarColor} flex-shrink-0`} />
            <div>
              <span className="text-[10px] uppercase font-bold text-[#567C8D]">Técnico Asignado</span>
              <h4 className="font-bold text-sm text-[#2F4156]">{assignedTech.name}</h4>
              <p className="text-xs text-[#2F4156]/70 leading-none mt-0.5">{assignedTech.specialty}</p>
            </div>
          </div>

          <div className="text-xs text-[#2F4156]/50 flex items-center gap-1.5 justify-center">
            <UserCheck className="w-4 h-4 text-[#567C8D]" />
            <span>Tiempo promedio actual de espera: 45 segundos</span>
          </div>

          <button
            onClick={() => setActiveView('index')}
            className="px-5 py-2 bg-[#F5EFEB] hover:bg-[#C8D9E6]/40 text-[#2F4156] text-xs font-bold rounded-xl transition border-0 outline-none"
          >
            Cancelar llamada
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          STATE: IN-CALL (LIVE COLLABORATION SUITE)
          ──────────────────────────────────────────────────────── */}
      {activeView === 'incall' && (
        <div className="bg-[#2F4156] text-white rounded-3xl overflow-hidden shadow-2xl min-h-[580px] flex flex-col relative" id="incall-suite">
          {/* Header Bar */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#2F4156]/90 relative z-20">
            <div className="flex items-center gap-3">
              <span className="bg-red-600 text-white font-bold text-[10px] tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white inline-block" />
                EN VIVO
              </span>
              <div className="text-xs border-l border-white/20 pl-3">
                <span className="font-bold block text-white">Soporte Nova Dental IOS</span>
                <span className="text-white/60 text-[10px] font-mono">ID Sesión: {formatCallTime(timerSeconds)}</span>
              </div>
            </div>

            {/* Attached Case Summary Badge */}
            {selectedCaseObj && (
              <div className="hidden lg:flex items-center gap-2.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
                <Layers className="w-4 h-4 text-[#C8D9E6]" />
                <div className="text-left">
                  <span className="font-bold block text-white">{selectedCaseObj.patientName}</span>
                  <span className="text-white/70 text-[10px]">{selectedCaseObj.product} (FDI: {selectedCaseObj.teeth.join(', ')})</span>
                </div>
              </div>
            )}

            <button
              onClick={handleFinishCall}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition shadow flex items-center gap-1.5 border-0 outline-none"
            >
              <X className="w-4 h-4" />
              Finalizar
            </button>
          </div>

          {/* Core Screen Split Area */}
          <div className="flex-1 flex flex-col md:flex-row min-h-[460px] relative">
            {/* Left/Center Box: Main Streams / Workspace */}
            <div className="flex-1 relative bg-slate-950 p-4 flex flex-col justify-between overflow-hidden">
              {/* Floating Tech Stream Frame */}
              <div className="absolute inset-0 z-0 flex items-center justify-center p-4">
                {sharingScreen ? (
                  /* Screen Share with mesh wireframe and annotations */
                  <div className="text-center w-full max-w-lg space-y-3 z-10">
                    <span className="inline-block bg-sky-600 font-bold text-[10px] px-2 py-0.5 rounded tracking-wide mb-2">
                      COMPARTIENDO ESCANEO NOVA DENTAL IOS (3D PREVIEW)
                    </span>
                    
                    {/* Interactivable annotational dental plot */}
                    <div
                      onClick={handleCanvasClick}
                      className="relative w-full aspect-video bg-[#2F4156]/90 rounded-2xl border-2 border-dashed border-[#C8D9E6]/30 overflow-hidden cursor-crosshair flex flex-col justify-center items-center shadow-inner"
                    >
                      {/* Medical dental lines */}
                      <div className="absolute inset-0 bg-[radial-gradient(#C8D9E6_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />
                      
                      <div className="text-center p-4">
                        <Layers className="w-14 h-14 mx-auto text-[#C8D9E6] opacity-35 animate-bounce-slow" />
                        <span className="text-xs uppercase font-extrabold text-white/40 block tracking-wider mt-1">Estudio Oclusal Interactivo del Técnico</span>
                        <span className="text-[10px] text-white/50 block font-light">Has click para marcar o detallar márgenes sobre este modelo</span>
                      </div>

                      {/* Display active annotations */}
                      {annotations.map((ann, i) => (
                        <div
                          key={i}
                          className="absolute translate-x-[-12px] translate-y-[-12px] flex items-center z-20 pointer-events-none transition"
                          style={{ left: `${ann.x}px`, top: `${ann.y}px` }}
                        >
                          {ann.type === 'circle' && (
                            <div className="w-6 h-6 rounded-full border-2 border-red-500 bg-red-400/20 flex justify-center items-center font-bold text-[10px] text-red-500 scale-125 shadow animate-ping-slow">
                              •
                            </div>
                          )}
                          {ann.type === 'arrow' && (
                            <div className="text-amber-400 font-extrabold text-lg filter drop-shadow">
                              ⬆
                            </div>
                          )}
                          {ann.type === 'text' && (
                            <span className="bg-[#2F4156] text-white border border-[#C8D9E6] rounded px-1.5 py-0.5 text-[8px] font-bold shadow whitespace-nowrap">
                              {ann.text}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center gap-2 items-center text-xs">
                      <span className="text-white/60">Controles de Anotación:</span>
                      <button
                        onClick={() => setActiveTool('circle')}
                        className={`p-1 px-2.5 rounded text-[10px] font-bold border ${activeTool === 'circle' ? 'bg-red-500 border-red-400 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
                      >
                        Círculo
                      </button>
                      <button
                        onClick={() => setActiveTool('arrow')}
                        className={`p-1 px-2.5 rounded text-[10px] font-bold border ${activeTool === 'arrow' ? 'bg-amber-500 border-amber-400 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
                      >
                        Flecha
                      </button>
                      <button
                        onClick={() => setActiveTool('text')}
                        className={`p-1 px-2.5 rounded text-[10px] font-bold border ${activeTool === 'text' ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-white/60'}`}
                      >
                        Texto:
                      </button>
                      {activeTool === 'text' && (
                        <input
                          type="text"
                          value={customText}
                          onChange={(e) => setCustomText(e.target.value)}
                          className="p-1 px-1.5 border border-white/20 bg-black/40 text-[10px] rounded focus:outline-none text-white max-w-[80px]"
                        />
                      )}
                      
                      {annotations.length > 0 && (
                        <button
                          onClick={() => setAnnotations([])}
                          className="p-0.5 text-red-400 text-[10px] underline hover:text-red-300 ml-2 bg-transparent"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Technician Video Cam Stream Simulation */
                  <div className="text-center z-10 flex flex-col items-center space-y-4">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-[#C8D9E6] mb-1">
                      En Línea Con:
                    </span>
                    <div className="relative">
                      {/* Speak visual outline ring */}
                      <span className={`absolute inset-[-12px] rounded-full border-4 transition-all duration-300 ${
                        techSpeaking ? 'border-[#567C8D] scale-105 opacity-80 animate-ping-slow' : 'border-transparent opacity-0'
                      }`} />
                      <span className={`block w-28 h-28 rounded-full bg-gradient-to-tr ${assignedTech.avatarColor} border-4 border-white/25 flex items-center justify-center`} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xl text-white">{assignedTech.name}</h3>
                      <p className="text-xs text-white/70">{assignedTech.specialty}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Float Self Camera feed bottom-right */}
              {!cameraOff && (
                <div className="absolute bottom-4 right-4 w-28 aspect-video md:w-36 bg-slate-900 border-2 border-[#2F4156] rounded-xl overflow-hidden z-25 flex items-center justify-center shadow-lg pointer-events-none">
                  {/* Internal camera overlay or avatar */}
                  <div className="text-center text-[10px] text-[#C8D9E6] p-1 font-bold bg-[#2F4156]/40 inset-0 absolute flex items-center justify-center">
                    Tú (Dra/Dr)
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Side Panel with Chat / Clinicial details */}
            {sidePanelOpen && (
              <div className="w-full md:w-80 border-l border-white/10 flex flex-col bg-[#2F4156] z-10 h-full">
                {/* Panel selector tab */}
                <div className="p-3 border-b border-white/10 flex justify-between items-center bg-[#2F4156]/60">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#C8D9E6]">
                    <MessageSquare className="w-4 h-4 text-[#567C8D]" />
                    Chat de Sesión
                  </span>
                  <button
                    onClick={() => setSidePanelOpen(false)}
                    className="p-1 hover:bg-white/10 rounded text-white bg-transparent outline-none"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Chat items list scroll */}
                <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto max-h-[320px] bg-slate-900/25">
                  {chatMessages.map((msg, i) => {
                    const isDoc = msg.sender === 'doc';
                    return (
                      <div key={i} className={`flex flex-col ${isDoc ? 'items-end' : 'items-start'}`}>
                        <div className={`p-2.5 rounded-xl text-xs max-w-[90%] font-medium ${isDoc ? 'bg-[#567C8D] text-white rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'}`}>
                          <p className="leading-relaxed">{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-white/50 font-mono mt-1 px-1">{msg.time}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Snapshot reference tray inside list */}
                {snapshots.length > 0 && (
                  <div className="p-3 bg-slate-950/40 border-t border-b border-white/5 space-y-1.5">
                    <span className="text-[10px] text-white/60 font-bold block uppercase tracking-wider">Snapshots capturados ({snapshots.length})</span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {snapshots.map((snap, i) => (
                        <div key={i} className="px-2 py-1 bg-[#2F4156] border border-[#C8D9E6]/30 text-white font-mono text-[9px] rounded flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{snap.split('-')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session message entry form */}
                <form onSubmit={handleSendChatInCall} className="p-2 border-t border-white/10 flex items-center gap-1.5 bg-slate-950/20">
                  <input
                    type="text"
                    placeholder="Escribe durante la llamada..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 p-2 border border-white/20 bg-slate-900 text-white rounded-lg text-xs focus:outline-none focus:border-[#567C8D]"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#567C8D] hover:bg-white hover:text-[#2F4156] text-white text-xs font-bold rounded-lg transition"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Bottom Control Actions Bar */}
          <div className="p-4 bg-slate-950 border-t border-white/10 flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMicMuted((prev) => !prev)}
                className={`p-3 rounded-full transition-all outline-none ${micMuted ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={micMuted ? "Activar micrófono" : "Silenciar micrófono"}
              >
                {micMuted ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
              </button>

              <button
                onClick={() => setCameraOff((prev) => !prev)}
                className={`p-3 rounded-full transition-all outline-none ${cameraOff ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={cameraOff ? "Activar cámara" : "Desactivar cámara"}
              >
                {cameraOff ? <VideoOff className="w-4.5 h-4.5" /> : <Video className="w-4.5 h-4.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSharingScreen((prev) => !prev)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${sharingScreen ? 'bg-sky-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <Monitor className="w-4 h-4" />
                {sharingScreen ? 'Anular pantalla' : 'Compartir Escaneo 3D'}
              </button>

              <button
                onClick={takeSnapshot}
                className="px-4 py-2 bg-[#567C8D] hover:bg-white hover:text-[#2F4156] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 border-0 outline-none"
              >
                <Camera className="w-4 h-4" />
                Tomar Snapshot
              </button>

              {!sidePanelOpen && (
                <button
                  onClick={() => setSidePanelOpen(true)}
                  className="p-2 border border-white/20 hover:bg-white/10 rounded-xl text-xs font-bold"
                >
                  Abrir Panel Chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          STATE: POST-CALL (RATING & LOGGING NOTES)
          ──────────────────────────────────────────────────────── */}
      {activeView === 'postcall' && (
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-[#C8D9E6]/50 shadow-lg max-w-xl mx-auto space-y-6" id="postcall-view">
          <div className="text-center space-y-1.5 border-b border-[#C8D9E6]/20 pb-4">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-[#2F4156]">Videoconsulta Finalizada con Éxito</h2>
            <p className="text-xs text-[#2F4156]/70">
              Sesión guardada en el historial general clínico. Por favor, califica y confirma tus notas.
            </p>
            {returnLabel && (
              <p className="text-[11px] font-bold text-[#567C8D] bg-[#C8D9E6]/30 border border-[#C8D9E6] rounded-lg px-3 py-1.5 inline-block mt-1">
                Al guardar regresarás a: {returnLabel}
              </p>
            )}
          </div>

          <div className="p-4 bg-[#F5EFEB] border border-[#C8D9E6]/30 rounded-xl space-y-3 text-sm">
            <h3 className="font-bold text-[#2F4156] uppercase tracking-wider text-[11px]">Resumen Administrativo</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#2F4156]/60 block font-bold">Duración:</span>
                <span className="font-mono font-bold text-[#2F4156]">{formatCallTime(timerSeconds)} minutos</span>
              </div>
              <div>
                <span className="text-[#2F4156]/60 block font-bold">Técnico Senior:</span>
                <span className="font-bold text-[#2F4156]">{assignedTech.name}</span>
              </div>
              {selectedCaseObj && (
                <div className="col-span-2">
                  <span className="text-[#2F4156]/60 block font-bold">Caso Clínico Asociado:</span>
                  <span className="font-bold text-[#2F4156]">{selectedCaseObj.patientName} — {selectedCaseObj.id} ({selectedCaseObj.product})</span>
                </div>
              )}
            </div>

            {snapshots.length > 0 && (
              <div className="pt-2 border-t border-[#C8D9E6]/30">
                <span className="text-[#2F4156]/70 font-semibold block text-[11px] uppercase">Snapshots Guardados:</span>
                <div className="flex gap-2 flex-wrap mt-1">
                  {snapshots.map((snap, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 bg-white border border-[#C8D9E6]/40 rounded font-semibold text-[#2F4156]">
                      {snap.split('-')[0]}.png
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Feedback star rate */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#2F4156]/80 uppercase tracking-wider">
              Califica la resolución técnica y la claridad:
            </label>
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="bg-transparent border-0 outline-none cursor-pointer"
                >
                  <Star className={`w-7 h-7 transition-all ${star <= rating ? 'fill-amber-400 text-amber-500' : 'text-[#C8D9E6]'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Session Editable Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#2F4156]/80 uppercase tracking-widest">
              Notas de la sesión clínicas:
            </label>
            <textarea
              rows={3}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full p-2.5 border border-[#C8D9E6] rounded-xl focus:outline-none focus:border-[#567C8D] text-xs text-[#2F4156] leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#C8D9E6]/30">
            <button
              onClick={submitPostCall}
              className="w-full bg-[#2F4156] hover:bg-[#567C8D] text-white py-2.5 rounded-xl font-bold text-xs shadow"
            >
              Confirmar y Guardar Registro
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          STATE: INDEX (LATEST TEAM DIRECTORY)
          ──────────────────────────────────────────────────────── */}
      {activeView === 'index' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="team-index">
            {/* List active Techs */}
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col space-y-4">
              <div>
                <h3 className="font-bold text-[#2F4156] text-base">Técnicos Senior en Línea</h3>
                <p className="text-xs text-[#2F4156]/70 mt-1">
                  Seleccione un laboratorista especializado para iniciar una videollamada para validación CAD/CAM.
                </p>
              </div>

              {/* Selection table of technicians */}
              <div className="space-y-3">
                {technicians.map((t) => (
                  <div
                    key={t.id}
                    id={`tech-selector-${t.id}`}
                    className="p-4 bg-[#F5EFEB]/30 hover:bg-[#C8D9E6]/20 border border-[#C8D9E6]/40 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors"
                  >
                    <div className="flex gap-3.5 items-center">
                      <div className="relative">
                        <span className={`block w-11 h-11 rounded-full bg-gradient-to-tr ${t.avatarColor}`} />
                        <span className="absolute bottom-0 right-0 block w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#2F4156]">{t.name}</h4>
                        <p className="text-xs text-[#2F4156]/60 font-semibold">{t.specialty}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={selectedCaseId}
                        onChange={(e) => setSelectedCaseId(e.target.value)}
                        className="p-1 px-2.5 border border-[#C8D9E6] rounded-lg text-xs bg-white text-[#2F4156] font-mono flex-1 sm:flex-initial"
                      >
                        <option value="">-- Sin Caso Asociado --</option>
                        {cases.filter(c => c.status !== 'Borrador').map(c => (
                          <option key={c.id} value={c.id}>
                            {c.id} — {c.patientName}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleStartCall(t)}
                        className="bg-[#2F4156] text-white hover:bg-[#567C8D] p-2 px-4 rounded-lg text-xs font-bold transition flex items-center gap-1 flex-shrink-0 border-0"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Conectar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Informational card */}
            <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <span className="p-3 bg-[#C8D9E6]/30 text-[#2F4156] rounded-xl inline-block">
                  <Sparkles className="w-5 h-5 text-[#2F4156]" />
                </span>
                <div>
                  <h3 className="font-bold text-[#2F4156] text-sm md:text-base">Revisión en 60s</h3>
                  <p className="text-xs text-[#2F4156]/75 mt-1.5 leading-relaxed">
                    Nuestro equipo técnico senior de Nova Dental cuenta con estaciones CAD/CAM de nivel clínico en Lima listos para validar tus preparaciones durante tu consulta odontológica.
                  </p>
                </div>
                <div className="space-y-2 text-xs text-[#2F4156]/90 font-medium">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#567C8D]" />
                    <span>Verabilidad estructural</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#567C8D]" />
                    <span>Alivio de márgenes gingivales</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#C8D9E6]/30">
                <span className="text-[11px] font-mono font-extrabold text-[#567C8D] bg-[#C8D9E6]/25 p-1 px-2.5 rounded-full block text-center">
                  Soporte Telefónico: 01 234-5678
                </span>
              </div>
            </div>
          </div>

          {/* Historical Calls lists */}
          <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm">
            <h3 className="font-bold text-[#2F4156] text-base border-b border-[#C8D9E6]/30 pb-3 mb-4">
              Historial de Videollamadas Realizadas
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#C8D9E6]/40 text-[#2F4156]/70 uppercase font-semibold bg-[#F5EFEB]/50">
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-3">Caso Clínico</th>
                    <th className="py-2.5 px-3">Técnico Dental</th>
                    <th className="py-2.5 px-3">Duración</th>
                    <th className="py-2.5 px-3">Notas Generales de Sesión</th>
                    <th className="py-2.5 px-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#C8D9E6]/20">
                  {cases.flatMap(c => c.priorCalls).map((session, index) => (
                    <tr key={index} className="hover:bg-[#C8D9E6]/10 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#2F4156]/80 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#567C8D]" />
                        {session.date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-[11px] font-bold text-[#567C8D]">{session.caseId}</div>
                        <div className="text-[10px] text-[#2F4156]/60 truncate max-w-[120px]">{session.caseName}</div>
                      </td>
                      <td className="py-3 px-3 text-[#2F4156] font-semibold">
                        {session.technician}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#2F4156]/80 font-bold">
                        {session.duration}
                      </td>
                      <td className="py-3 px-3 text-[#2F4156]/70 max-w-[200px] truncate italic leading-relaxed">
                        {session.notes}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="p-1 px-2.5 bg-[#C8D9E6]/40 text-[#2F4156] text-[10px] font-bold rounded-lg leading-none cursor-default">
                          Sesión Guardada
                        </span>
                      </td>
                    </tr>
                  ))}
                  {cases.flatMap(c => c.priorCalls).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[#2F4156]/50 italic text-xs">
                        No se registran videollamadas anteriores. Sube un escaneo y conéctate para ver el log.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
