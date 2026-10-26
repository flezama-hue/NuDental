/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Case, ChatMessage, ScanFile } from '../types';
import { Odontogram } from './Odontogram';
import designCadImg from '../assets/images/escaneo/05_preaprobacion_diseno_3d_cad.png';
import meshStlImg from '../assets/images/escaneo/04_previsualizacion_malla_stl_3d.png';
import {
  ArrowLeft,
  Video,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Star,
  RefreshCw,
  Camera,
  CornerDownLeft,
  XCircle,
  Send,
  Download,
  Wallet,
  CheckCircle2,
  Loader2,
  CreditCard,
  CircleDollarSign,
  Trash2,
  Pencil,
  Upload,
  ImagePlus,
  ThumbsUp,
  ThumbsDown,
  Box,
  ChevronDown,
  PackageCheck,
  Truck,
  Check
} from 'lucide-react';

interface CaseDetailsProps {
  caseItem: Case;
  onNavigateBack: () => void;
  onUpdateCaseStatus: (caseId: string, status: Case['status'], extra?: any) => void;
  onUpdateCase: (caseId: string, partial: Partial<Case>) => void;
  onAddChatMessage: (caseId: string, text: string) => void;
  onStartSupportCall: (caseId: string) => void;
  onMarkAsPaid: (caseId: string) => void;
  onRejectPayment: (caseId: string) => void;
}

export const CaseDetails: React.FC<CaseDetailsProps> = ({
  caseItem,
  onNavigateBack,
  onUpdateCaseStatus,
  onUpdateCase,
  onAddChatMessage,
  onStartSupportCall,
  onMarkAsPaid,
  onRejectPayment,
}) => {
  const [showRemakeForm, setShowRemakeForm] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');

  // Remake Form inputs
  const [remakeReason, setRemakeReason] = useState('Ajuste de margen');
  const [remakeDescription, setRemakeDescription] = useState('');

  // Rating input
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  // Skip the very first run so opening a case doesn't yank the whole page down.
  const chatMounted = useRef(false);

  useEffect(() => {
    // Scroll only the chat container (not the window) to its latest message.
    const container = chatEndRef.current?.parentElement;
    if (!container) return;
    if (!chatMounted.current) {
      chatMounted.current = true;
      container.scrollTop = container.scrollHeight; // initial: jump, no page scroll
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [caseItem.chat, chatOpen]);

  const steps: Case['status'][] = ['Enviado', 'Recibido', 'Aceptado', 'Aprobación de diseño', 'En producción', 'En camino', 'Entregado'];

  const getStepIndex = (status: Case['status']): number => {
    if (status === 'Rechazado' || status === 'Re-trabajo' || status === 'Cancelado') {
      return 3; // Keep middle focus
    }
    return steps.indexOf(status);
  };

  const currentStepIdx = getStepIndex(caseItem.status);

  const paymentStatus = caseItem.paymentStatus || 'pendiente';
  const fmtPen = (n: number) =>
    `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Editable instructions ──
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState(caseItem.instructions || '');
  useEffect(() => { setInstructionsDraft(caseItem.instructions || ''); }, [caseItem.id, caseItem.instructions]);

  const saveInstructions = () => {
    onUpdateCase(caseItem.id, { instructions: instructionsDraft });
    setEditingInstructions(false);
    onAddChatMessage(caseItem.id, `[AUTO-LAB] El doctor actualizó las instrucciones clínicas del caso ${caseItem.id}.`);
  };

  // ── Add files / photos ──
  const today = new Date().toISOString().split('T')[0];
  const addFile = (type: ScanFile['type']) => {
    const isPhoto = type === 'photo';
    const rand = Math.floor(Math.random() * 9000) + 1000;
    const newFile: ScanFile = {
      name: isPhoto ? `FOTO_CLINICA_${rand}.jpg` : `SCAN_${type.toUpperCase()}_${rand}.${type}`,
      size: isPhoto ? `${(Math.random() * 3 + 1).toFixed(1)} MB` : `${(Math.random() * 12 + 8).toFixed(1)} MB`,
      date: today,
      type,
    };
    onUpdateCase(caseItem.id, { files: [...caseItem.files, newFile] });
    onAddChatMessage(caseItem.id, `[AUTO-LAB] El doctor adjuntó un nuevo archivo (${newFile.name}) al caso ${caseItem.id}.`);
  };

  // ── Production tracking (Amazon-style) ──
  const [trackingOpen, setTrackingOpen] = useState(false);
  const PRODUCTION_STAGES = [
    'Recepción del caso',
    'Diseño CAD',
    'Producción (fresado)',
    'Acabado y caracterización',
    'Control de calidad',
    'Despacho',
  ];
  const prodCompleted = (() => {
    switch (caseItem.status) {
      case 'Recibido': return 1;
      case 'Aceptado': return 2;
      case 'Aprobación de diseño': return 2;
      case 'En producción': return 3;
      case 'En camino': return 6;
      case 'Entregado': return 6;
      default: return 0;
    }
  })();
  const productionReached = ['En producción', 'En camino', 'Entregado'].includes(caseItem.status);
  const fmtDateTime = (d: Date) =>
    d.toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const stageOffsetsH = [0, 8, 26, 50, 68, 76];
  const trackBase = new Date(`${caseItem.sentDate}T09:15:00`);
  const stageDates = stageOffsetsH.map((h) => {
    const d = new Date(trackBase);
    d.setHours(d.getHours() + h);
    return d;
  });

  // ── Cancel case ──
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const confirmCancelCase = () => {
    onUpdateCase(caseItem.id, { status: 'Cancelado' });
    setShowCancelConfirm(false);
    onAddChatMessage(caseItem.id, `[AUTO-LAB] El doctor canceló el caso ${caseItem.id}.`);
  };
  const canCancel = !['Entregado', 'Cancelado', 'Rechazado'].includes(caseItem.status);

  // ── Design 3D approval ──
  const [designComment, setDesignComment] = useState('');
  const design = caseItem.designApproval;

  // Pick the CAD design image: bridges → multi-unit render; crowns → intraoral scan.
  const designImage = designCadImg;

  const simulateDesignSent = () => {
    onUpdateCase(caseItem.id, {
      status: 'Aprobación de diseño',
      designApproval: { sentDate: today, modelLabel: `DISEÑO_CAD_3D_${caseItem.id.replace('#', '')}`, status: 'pendiente' },
    });
    onAddChatMessage(caseItem.id, `[AUTO-LAB] El laboratorio envió el diseño 3D del caso ${caseItem.id} para su aprobación antes de producir.`);
  };

  const approveDesign = () => {
    onUpdateCase(caseItem.id, {
      status: 'En producción',
      designApproval: { ...(design as any), status: 'aprobado', doctorComment: designComment },
    });
    onAddChatMessage(caseItem.id, `[AUTO-LAB] Diseño 3D APROBADO por el doctor.${designComment ? ' Comentario: ' + designComment : ''} Se procede a producción.`);
    setDesignComment('');
  };

  const rejectDesign = () => {
    onUpdateCase(caseItem.id, {
      status: 'Aceptado',
      designApproval: { ...(design as any), status: 'rechazado', doctorComment: designComment },
    });
    onAddChatMessage(caseItem.id, `[AUTO-LAB] Diseño 3D RECHAZADO por el doctor.${designComment ? ' Comentario: ' + designComment : ''} El laboratorio realizará ajustes y reenviará.`);
    setDesignComment('');
  };

  // Check if case is rejected
  const isRejected = caseItem.status === 'Rechazado';
  const isRemake = caseItem.status === 'Re-trabajo';
  const isCancelled = caseItem.status === 'Cancelado';

  const handleConfirmReception = () => {
    // Transition to Entregado and open rating
    onUpdateCaseStatus(caseItem.id, 'Entregado');
    setShowRatingModal(true);
  };

  const submitRating = () => {
    onUpdateCaseStatus(caseItem.id, 'Entregado', {
      rating: {
        score: ratingScore,
        comment: ratingComment,
        reqRemake: false,
      },
    });
    setShowRatingModal(false);
    setRatingComment('');
  };

  const submitRemake = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCaseStatus(caseItem.id, 'Re-trabajo', {
      remakeForm: {
        reason: remakeReason,
        description: remakeDescription,
        attachedFiles: ['FOTO_FRACTURA_MUESTRA.jpg'],
      },
    });
    setShowRemakeForm(false);
    setRemakeDescription('');

    // Send a message to chat explaining remake
    onAddChatMessage(caseItem.id, `[AUTOMÁTICO - RE-TRABAJO] Solicitud de re-trabajo ingresada por motivo de: ${remakeReason}. Descripción: ${remakeDescription}`);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    onAddChatMessage(caseItem.id, chatInput.trim());
    setChatInput('');

    // Bot automated technician reply
    setTimeout(() => {
      onAddChatMessage(
        caseItem.id,
        `[AUTO-LAB] Entendido doctor. He anexado estas especificaciones directamente al archivo CAD para el caso ${caseItem.id}.`
      );
    }, 1500);
  };

  return (
    <div className="space-y-6" id="case-details">
      {/* Detail Header back */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#C8D9E6]/40 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateBack}
            className="p-2 border border-[#C8D9E6] hover:bg-[#C8D9E6]/30 text-[#2F4156] rounded-xl transition bg-transparent"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-[#C8D9E6]/50 px-2 py-0.5 rounded text-[#2F4156]">
                ID: {caseItem.id}
              </span>
              {caseItem.urgency === 'express' && (
                <span className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest animate-pulse">
                  URGENTE
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#2F4156] mt-1">{caseItem.patientName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action buttons technical consultation */}
          <button
            onClick={() => onStartSupportCall(caseItem.id)}
            className="bg-[#2F4156] text-white hover:bg-[#567C8D] p-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow border-0 outline-none"
          >
            <Video className="w-4 h-4 animate-pulse" />
            Consultar con Técnico
          </button>
          {canCancel && (
            <button
              onClick={() => setShowCancelConfirm(true)}
              title="Cancelar caso"
              className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 p-2.5 rounded-xl transition flex items-center gap-1.5 outline-none"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-[#C8D9E6] p-6 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-[#2F4156] text-base">¿Cancelar este caso?</h3>
              <p className="text-xs text-[#2F4156]/70 mt-1.5 leading-relaxed">
                El caso <span className="font-mono font-bold">{caseItem.id}</span> de {caseItem.patientName} pasará a estado <span className="font-bold">Cancelado</span> y se notificará al laboratorio. Esta acción detiene la producción.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-transparent text-[#2F4156] border border-[#C8D9E6] hover:bg-[#F5EFEB] rounded-xl font-bold text-xs transition"
              >
                No, volver
              </button>
              <button
                onClick={confirmCancelCase}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition shadow-sm border-0 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TIMELINE STEPPER ROW
          ──────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm" id="progress-timeline">
        <h3 className="text-xs font-black uppercase text-[#2F4156]/50 tracking-widest mb-4">Crucigrama de Producción Clínico</h3>
        
        {isCancelled ? (
          /* Cancelled Alert Timeline */
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <Trash2 className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <span className="font-extrabold block">Caso Cancelado por el Odontólogo</span>
              <p className="text-xs text-red-700 mt-0.5">
                Este caso fue cancelado y retirado del flujo de producción. Si fue un error, contacta a soporte para reactivarlo.
              </p>
            </div>
          </div>
        ) : isRejected ? (
          /* Rejection Alert Timeline */
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <XCircle className="w-6 h-6 text-red-600 animate-pulse flex-shrink-0" />
            <div>
              <span className="font-extrabold block">Orden Médica Rechazada por Control de Calidad</span>
              <p className="text-xs text-red-700 mt-0.5">
                Nuestros tecnólogos dentales detectaron un impedimento de fresado en sus archivos. Revise el panel "Case Talk" a la derecha para ver las aclaraciones o solicite soporte de diseño en vivo.
              </p>
            </div>
          </div>
        ) : (
          /* Standard Progress Stepper */
          <div className="grid grid-cols-7 gap-2 text-center relative pt-2">
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-[#C8D9E6]/40 z-0" />

            {steps.map((step, idx) => {
              const isPast = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;

              let dotClass = "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] mx-auto z-10 relative ";
              if (isPast) dotClass += "bg-emerald-500 text-white";
              else if (isCurrent) dotClass += "bg-[#567C8D] text-white ring-4 ring-[#567C8D]/20 animate-pulse";
              else dotClass += "bg-[#C8D9E6] text-transparent";

              const isProductionStep = step === 'En producción';
              const clickable = isProductionStep && productionReached;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => clickable && setTrackingOpen((o) => !o)}
                  disabled={!clickable}
                  className={`flex flex-col items-center bg-transparent border-0 ${clickable ? 'cursor-pointer group' : 'cursor-default'}`}
                  title={clickable ? 'Ver seguimiento de producción' : undefined}
                >
                  <div className={dotClass + (clickable ? ' group-hover:ring-4 group-hover:ring-[#567C8D]/30' : '')}>{isPast ? '✓' : ''}</div>
                  <span className={`text-[10px] font-bold mt-2 block ${isCurrent ? 'text-[#2F4156]' : 'text-[#2F4156]/50'}`}>
                    {step}
                  </span>
                  {clickable && (
                    <span className="text-[8px] text-[#567C8D] font-bold mt-0.5 inline-flex items-center gap-0.5">
                      {trackingOpen ? 'Ocultar' : 'Ver seguimiento'}
                      <ChevronDown className={`w-2.5 h-2.5 transition-transform ${trackingOpen ? 'rotate-180' : ''}`} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Production tracking panel (Amazon-style) */}
        {trackingOpen && productionReached && (
          <div className="mt-5 border-t border-[#C8D9E6]/30 pt-4 animate-fade-in">
            <h4 className="text-xs font-black uppercase text-[#2F4156] tracking-widest mb-3 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-[#567C8D]" />
              Seguimiento de producción
            </h4>
            <ol className="space-y-0">
              {PRODUCTION_STAGES.map((stage, i) => {
                const done = i < prodCompleted;
                const current = i === prodCompleted && caseItem.status === 'En producción';
                const isLast = i === PRODUCTION_STAGES.length - 1;
                return (
                  <li key={stage} className="flex gap-3">
                    {/* dot + connector */}
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : current ? 'bg-[#567C8D] ring-4 ring-[#567C8D]/20 animate-pulse' : 'bg-[#C8D9E6]'}`}>
                        {done && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {!isLast && <div className={`w-0.5 flex-1 min-h-[26px] ${done ? 'bg-emerald-500/50' : 'bg-[#C8D9E6]/50'}`} />}
                    </div>
                    {/* text */}
                    <div className={`pb-4 ${isLast ? '' : ''}`}>
                      <span className={`text-xs font-bold block ${done || current ? 'text-[#2F4156]' : 'text-[#2F4156]/45'}`}>{stage}</span>
                      <span className={`text-[10px] font-mono block mt-0.5 ${done ? 'text-emerald-700' : current ? 'text-[#567C8D]' : 'text-[#2F4156]/35'}`}>
                        {done ? fmtDateTime(stageDates[i]) : current ? 'En curso…' : 'Pendiente'}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
            {/* Estimated delivery */}
            <div className="mt-1 flex items-center gap-2 bg-[#F5EFEB]/60 border border-[#C8D9E6]/40 rounded-xl px-4 py-2.5 text-xs">
              <Truck className="w-4 h-4 text-[#567C8D] flex-shrink-0" />
              <span className="text-[#2F4156]/70 font-semibold">Entrega estimada:</span>
              <span className="font-bold text-[#2F4156] font-mono">{caseItem.deliveryDate}</span>
            </div>
          </div>
        )}

        {isRemake && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 text-orange-800 text-sm mt-4 animate-fade-in">
            <RefreshCw className="w-5 h-5 text-orange-600 animate-spin-slow flex-shrink-0" />
            <div>
              <span className="font-extrabold block">Repetido / Re-trabajo en Proceso de Fresado</span>
              <p className="text-xs text-orange-700 mt-0.5">
                Motivo: <span className="font-bold font-mono">{caseItem.remakeForm?.reason}</span> — {caseItem.remakeForm?.description}.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────
          DESIGN 3D APPROVAL (before production)
          ──────────────────────────────────────────────────────── */}
      {caseItem.status === 'Aceptado' && (
        <div className="bg-[#F5EFEB]/60 p-5 rounded-2xl border border-[#C8D9E6] flex flex-wrap justify-between items-center gap-4 animate-fade-in">
          <div className="flex gap-3 items-start">
            <Box className="w-6 h-6 text-[#567C8D] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#2F4156] block text-sm">Esperando diseño 3D del laboratorio</span>
              <p className="text-xs text-[#2F4156]/70 mt-0.5 max-w-lg leading-relaxed">
                Antes de producir, el laboratorio te enviará un modelo 3D de la pieza para tu aprobación.
              </p>
            </div>
          </div>
          <button
            onClick={simulateDesignSent}
            className="px-4 py-2.5 bg-[#2F4156] hover:bg-[#567C8D] text-white text-xs font-bold rounded-xl shadow border-0 transition"
          >
            Simular envío de diseño 3D
          </button>
        </div>
      )}

      {caseItem.status === 'Aprobación de diseño' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-[#567C8D]/40 shadow-md space-y-5 animate-fade-in" id="design-approval">
          <div className="flex items-center gap-2 border-b border-[#C8D9E6]/30 pb-3">
            <Box className="w-5 h-5 text-[#567C8D]" />
            <div>
              <h3 className="font-bold text-[#2F4156] text-base">Aprobación del Diseño 3D</h3>
              <p className="text-xs text-[#2F4156]/60">
                Revisa el modelo propuesto por el laboratorio. La producción inicia solo si lo apruebas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 3D model preview — real CAD design image */}
            <div className="relative aspect-video bg-[#2F4156] rounded-xl overflow-hidden flex flex-col justify-center items-center text-white">
              <img
                src={designImage}
                alt={`Diseño 3D ${caseItem.isBridge ? 'del puente' : 'de la corona'}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 text-[9px] uppercase font-extrabold text-white tracking-widest bg-[#2F4156]/80 px-2 py-1 rounded">
                {design?.modelLabel || 'DISEÑO_CAD_3D'}
              </span>
              <span className="absolute bottom-2 left-2 right-2 text-[9px] text-white bg-black/55 p-1 rounded font-mono text-center">
                Propuesta del laboratorio · {design?.sentDate}
              </span>
            </div>

            {/* Decision panel */}
            <div className="flex flex-col">
              <label className="block text-[#2F4156]/70 font-bold text-[11px] uppercase tracking-wider mb-1.5">
                Comentarios para el laboratorio (opcional)
              </label>
              <textarea
                rows={4}
                value={designComment}
                onChange={(e) => setDesignComment(e.target.value)}
                placeholder="Ej. La anatomía oclusal se ve bien, pero ajustar levemente el punto de contacto mesial antes de fresar."
                className="flex-1 w-full p-2.5 bg-[#F5EFEB]/30 border border-[#C8D9E6] rounded-xl focus:outline-none focus:border-[#567C8D] text-xs text-[#2F4156] leading-relaxed"
              />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={rejectDesign}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                >
                  <ThumbsDown className="w-4 h-4" />
                  Rechazar diseño
                </button>
                <button
                  onClick={approveDesign}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition border-0 shadow-sm"
                >
                  <ThumbsUp className="w-4 h-4" />
                  Aprobar y producir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prior design decision banner (once resolved) */}
      {design && design.status !== 'pendiente' && caseItem.status !== 'Aprobación de diseño' && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm animate-fade-in ${
          design.status === 'aprobado' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {design.status === 'aprobado' ? <ThumbsUp className="w-5 h-5 flex-shrink-0 mt-0.5" /> : <ThumbsDown className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <div className="text-xs">
            <span className="font-extrabold block">
              Diseño 3D {design.status === 'aprobado' ? 'aprobado' : 'rechazado'} por el doctor
            </span>
            {design.doctorComment && <p className="mt-0.5 italic leading-relaxed">"{design.doctorComment}"</p>}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          LOGISTICAL ALERTS: CONFIRM RECEPTION
          ──────────────────────────────────────────────────────── */}
      {/* PAYMENT GATE: production finished, awaiting payment to release shipment */}
      {caseItem.status === 'En producción' && paymentStatus !== 'pagado' && (
        <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 flex justify-between items-center flex-wrap gap-4 animate-fade-in">
          <div className="flex gap-3 text-left">
            <Wallet className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-black text-amber-950 block">Pago requerido para liberar el envío</span>
              <p className="text-xs text-amber-900/80 leading-relaxed">
                El laboratorio terminó tu caso. Realiza el pago ({fmtPen(caseItem.price || 0)}) y se despachará automáticamente a entrega.
              </p>
            </div>
          </div>
          {paymentStatus === 'en_validacion' ? (
            <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Loader2 className="w-4 h-4 animate-spin" /> Validando pago…
            </span>
          ) : (
            <button
              onClick={() => onMarkAsPaid(caseItem.id)}
              className="p-2.5 px-5 bg-[#2F4156] hover:bg-[#567C8D] text-white font-bold text-xs rounded-xl shadow border-0 inline-flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" /> Pagar y liberar envío
            </button>
          )}
        </div>
      )}

      {caseItem.status === 'En camino' && (
        <div className="space-y-3">
          {/* Estimated delivery banner */}
          <div className="bg-[#2F4156] text-white p-4 rounded-xl flex items-center gap-3 animate-fade-in">
            <Truck className="w-6 h-6 text-[#C8D9E6] flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#C8D9E6] block">Entrega estimada (Est. Delivery)</span>
              <span className="text-lg font-extrabold font-mono block">{caseItem.deliveryDate}</span>
            </div>
            <span className="text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">En tránsito</span>
          </div>

          <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 flex justify-between items-center flex-wrap gap-4 animate-fade-in" id="reception-alert">
            <div className="flex gap-3 text-left">
              <CheckCircle className="w-6 h-6 text-amber-600 flex-shrink-0 animate-bounce" />
              <div>
                <span className="font-black text-amber-950 block">¿Recibiste esta Restauración?</span>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  El transportista asignado de Nova Dental reporta que el despacho clínico ya fue entregado a su dirección.
                </p>
              </div>
            </div>
            <button
              onClick={handleConfirmReception}
              className="p-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow border-0"
            >
              Confirmar Recepción
            </button>
          </div>
        </div>
      )}

      {/* RATING DISPLAY IF POSTED */}
      {caseItem.rating && (
        <div className="bg-[#F5EFEB] p-5 rounded-xl border border-[#C8D9E6] flex gap-3 text-left items-start animate-fade-in">
          <Star className="w-5 h-5 text-amber-500 fill-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-extrabold text-[#2F4156] block">Calificación de la prótesis ingresada ({caseItem.rating.score}/5 estrellas)</span>
            <p className="text-[#2F4156]/70 mt-1 italic leading-relaxed">"{caseItem.rating.comment}"</p>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          CORE LAYOUT GRID: CASE DATA & MOCK VIEWER vs CASE TALK
          ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Structural Clinical details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col space-y-5">
            <h3 className="font-bold text-[#2F4156] text-base border-b border-[#C8D9E6]/30 pb-3">Ficha de Información de Fabricación</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs select-none">
              <div className="p-3 bg-[#F5EFEB]/30 border border-[#C8D9E6]/35 rounded-xl text-left">
                <span className="text-[#2F4156]/50 font-bold block uppercase tracking-wider text-[10px]">Producto dental central</span>
                <span className="font-extrabold text-[#2F4156] text-sm block mt-0.5">{caseItem.product}</span>
              </div>
              <div className="p-3 bg-[#F5EFEB]/30 border border-[#C8D9E6]/35 rounded-xl text-left">
                <span className="text-[#2F4156]/50 font-bold block uppercase tracking-wider text-[10px]">Material clínico especificado</span>
                <span className="font-extrabold text-[#567C8D] text-sm block mt-0.5">{caseItem.material}</span>
              </div>
              <div className="p-3 bg-[#F5EFEB]/30 border border-[#C8D9E6]/35 rounded-xl text-left">
                <span className="text-[#2F4156]/50 font-bold block uppercase tracking-wider text-[10px]">Tono guía dental de sonrisa</span>
                <span className="font-extrabold text-[#2F4156] text-sm block font-mono mt-0.5">VITA {caseItem.shade}</span>
              </div>
              <div className="p-3 bg-[#F5EFEB]/30 border border-[#C8D9E6]/35 rounded-xl text-left">
                <span className="text-[#2F4156]/50 font-bold block uppercase tracking-wider text-[10px]">Fecha estimada de recepción</span>
                <span className="font-extrabold text-blue-700 text-xs block font-mono mt-0.5">{caseItem.deliveryDate}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-[#2F4156]/60 font-bold block text-xs uppercase tracking-wider">Indicaciones clínicas enviadas</span>
                {!editingInstructions && (
                  <button
                    onClick={() => setEditingInstructions(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#567C8D] hover:text-[#2F4156] bg-transparent border-0 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>
              {editingInstructions ? (
                <div className="mt-1.5 space-y-2">
                  <textarea
                    rows={4}
                    value={instructionsDraft}
                    onChange={(e) => setInstructionsDraft(e.target.value)}
                    className="w-full p-3 bg-white border border-[#C8D9E6] rounded-xl focus:outline-none focus:border-[#567C8D] text-xs text-[#2F4156] leading-relaxed"
                    placeholder="Describe las indicaciones clínicas para el laboratorio…"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditingInstructions(false); setInstructionsDraft(caseItem.instructions || ''); }}
                      className="px-3 py-1.5 bg-transparent text-[#2F4156] border border-[#C8D9E6] hover:bg-[#F5EFEB] rounded-lg font-bold text-[11px] transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveInstructions}
                      className="px-3 py-1.5 bg-[#2F4156] hover:bg-[#567C8D] text-white rounded-lg font-bold text-[11px] transition border-0"
                    >
                      Guardar instrucciones
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 p-3.5 bg-[#F5EFEB]/20 border border-[#C8D9E6]/30 text-xs text-[#2F4156]/80 rounded-xl leading-relaxed italic">
                  "{caseItem.instructions || 'Sin instrucciones adicionales especificadas por el odontólogo.'}"
                </p>
              )}
            </div>

            {/* STATIC READ ONLY ODONTOGRAM TO HIGHLIGHT ACTIVE TEETH ON THE SAME CARD */}
            <Odontogram
              selectedTeeth={caseItem.teeth}
              onChange={() => {}}
              isBridge={caseItem.isBridge}
              onBridgeToggle={() => {}}
              readOnly={true}
            />
          </div>

          {/* Simulated 3D Dental Viewer File Attachments */}
          <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#C8D9E6]/30 pb-3 gap-2 flex-wrap">
              <h3 className="font-bold text-[#2F4156] text-base">Archivos STL/PLY & Preview 3D</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => addFile('stl')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#F5EFEB] text-[#2F4156] border border-[#C8D9E6] hover:bg-[#C8D9E6]/40 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir STL/PLY
                </button>
                <button
                  onClick={() => addFile('photo')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#F5EFEB] text-[#2F4156] border border-[#C8D9E6] hover:bg-[#C8D9E6]/40 transition"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Subir foto
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dental 3D preview viewport — real occlusion scan */}
              <div className="relative aspect-video bg-[#2F4156] rounded-xl overflow-hidden flex flex-col justify-center items-center text-white">
                <img
                  src={meshStlImg}
                  alt="Escaneo de oclusión — Nova Dental IOS"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 text-[9px] uppercase font-extrabold text-white tracking-widest bg-[#2F4156]/80 px-2 py-1 rounded">Vista previa — Nova Dental IOS</span>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[9px] text-white bg-black/55 p-1 rounded font-mono">
                  <span>Caras: 384k polígonos</span>
                  <span>Margen: Validado</span>
                </div>
              </div>

              {/* Attachments List */}
              <div className="space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5 overflow-y-auto max-h-[140px] custom-scrollbar text-xs">
                  {caseItem.files.map((file, i) => (
                    <div key={i} className="p-2 border border-[#C8D9E6]/40 rounded-lg bg-[#F5EFEB]/20 flex justify-between items-center text-[#2F4156]">
                      <div className="truncate flex-1 pr-1.5">
                        <span className="font-bold truncate block">{file.name}</span>
                        <span className="font-mono text-[9px] text-[#2F4156]/50 uppercase">{file.type} • {file.size}</span>
                      </div>
                      <button className="p-1 hover:bg-[#C8D9E6] rounded-lg transition text-[#2F4156]/70 bg-transparent border-0 flex">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Draw re-trabajo request triggers */}
                {(caseItem.status === 'Entregado' || caseItem.status === 'Rechazado') && !showRemakeForm && (
                  <button
                    onClick={() => setShowRemakeForm(true)}
                    className="w-full bg-[#567C8D] hover:bg-[#2F4156] text-white p-2.5 rounded-xl text-xs font-semibold shadow transition-all flex items-center justify-center gap-1.5 border-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Solicitar Re-trabajo (Remake)
                  </button>
                )}
              </div>
            </div>

            {/* REMAKE / RE-TRABAJO FORM DRAWER SHEET INTERFACE */}
            {showRemakeForm && (
              <div className="bg-orange-50/60 p-5 rounded-xl border border-orange-200 mt-4 space-y-4 animate-fade-in text-left">
                <div className="flex justify-between items-center border-b border-orange-200/50 pb-2">
                  <h4 className="font-black text-sm text-orange-950 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-orange-600 animate-spin-slow" />
                    Solicitar Garantía / Re-trabajo Clínico
                  </h4>
                  <button
                    onClick={() => setShowRemakeForm(false)}
                    className="p-1 text-orange-900/60 hover:bg-orange-100/55 rounded-lg border-0 bg-transparent"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={submitRemake} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-orange-950 font-bold mb-1 uppercase tracking-wide">
                        Motivo del Re-trabajo *
                      </label>
                      <select
                        value={remakeReason}
                        onChange={(e) => setRemakeReason(e.target.value)}
                        className="w-full p-2.5 bg-white border border-orange-300 rounded-xl focus:outline-none text-xs text-orange-950 font-bold"
                      >
                        <option value="Ajuste de margen">Ajuste de margen defectuoso</option>
                        <option value="Color/tono incorrecto">Color/tono incorrecto (VITA shade error)</option>
                        <option value="Ajuste oclusal">Ajuste oclusal desbalanceado</option>
                        <option value="Fractura">Fractura de cerámica o material</option>
                        <option value="Otro">Otro motivo clínico específico</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-orange-950 font-bold mb-1 uppercase tracking-wide">
                        Evidencia Clínica / Fotos Clínicas *
                      </label>
                      <div className="p-2 border border-dashed border-orange-300 bg-white rounded-xl text-center cursor-pointer text-[10px] text-orange-900/70">
                        <Camera className="w-4 h-4 text-[#567C8D] mx-auto mb-1" />
                        <span>Tomar fotografía o subir JPG</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-orange-950 font-bold mb-1 uppercase tracking-wide">
                      Descripción detallada del problema mecánico o estético *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Ej. El color final en boca se ve demasiado opaco comparado con el puente antagonista. Solicito repetir con mayor caracterización en el tercio incisal."
                      value={remakeDescription}
                      onChange={(e) => setRemakeDescription(e.target.value)}
                      className="w-full p-2.5 bg-white border border-orange-300 rounded-xl focus:outline-none text-xs text-orange-950 leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-orange-200/50">
                    <button
                      type="button"
                      onClick={() => setShowRemakeForm(false)}
                      className="px-4 py-2 bg-transparent text-orange-900 border border-orange-300 hover:bg-orange-100 rounded-xl font-bold transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition shadow-sm border-0"
                    >
                      Confirmar y Repetir Orden
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3: Case Talk sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Billing / Payment status */}
          <div className="bg-white rounded-2xl border border-[#C8D9E6]/50 shadow-md p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase text-[#2F4156] flex items-center gap-1.5 tracking-wider">
                <Wallet className="w-4.5 h-4.5 text-[#567C8D]" />
                Pago del caso
              </span>
              {paymentStatus === 'pagado' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Pagado
                </span>
              ) : paymentStatus === 'en_validacion' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Loader2 className="w-3 h-3 animate-spin" /> Validando pago…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <CircleDollarSign className="w-3 h-3" /> Pendiente
                </span>
              )}
            </div>

            <div className="flex justify-between items-baseline border-t border-[#C8D9E6]/30 pt-3">
              <span className="text-[11px] text-[#2F4156]/60 font-semibold uppercase tracking-wider">Monto</span>
              <span className="text-xl font-extrabold text-[#2F4156] font-mono">
                {caseItem.price != null ? fmtPen(caseItem.price) : '—'}
              </span>
            </div>

            {paymentStatus === 'pendiente' && (
              <button
                onClick={() => onMarkAsPaid(caseItem.id)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#2F4156] text-white hover:bg-[#567C8D] transition border-0"
              >
                <CreditCard className="w-4 h-4" />
                Marcar como pagado
              </button>
            )}
            {paymentStatus === 'en_validacion' && (
              <div className="space-y-2">
                <p className="text-[11px] text-[#2F4156]/60 leading-relaxed">
                  El sistema está verificando si el depósito ingresó. Esto puede tardar unos segundos.
                </p>
                <button
                  onClick={() => onRejectPayment(caseItem.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                >
                  <XCircle className="w-4 h-4" />
                  Simular rechazo
                </button>
              </div>
            )}
            {paymentStatus === 'pagado' && (
              <p className="text-[11px] text-emerald-700/80 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Depósito confirmado por el sistema.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-[#C8D9E6]/50 shadow-md flex flex-col min-h-[480px]">
            {/* Header drawer talk */}
            <div className="p-4 border-b border-[#C8D9E6]/30 flex justify-between items-center bg-[#F5EFEB]/40">
              <span className="text-xs font-black uppercase text-[#2F4156] flex items-center gap-1.5 tracking-wider select-none">
                <MessageSquare className="w-4.5 h-4.5 text-[#567C8D]" />
                Case Talk Clínico
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
            </div>

            {/* Chat list messages area scroll */}
            <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto max-h-[300px] min-h-[260px] bg-[#F5EFEB]/10">
              {caseItem.chat.map((m) => {
                const isDoc = m.sender === 'doctor';
                const content = m.text.startsWith('[AUTOMÁTICO') || m.text.startsWith('[AUTO-LAB]')
                  ? m.text.replace('[AUTOMÁTICO - RE-TRABAJO] ', '').replace('[AUTO-LAB] ', '')
                  : m.text;

                const isAuto = m.text.startsWith('[AUTOMÁTICO') || m.text.startsWith('[AUTO-LAB]');

                return (
                  <div key={m.id} className={`flex flex-col ${isDoc ? 'items-end ml-auto' : 'items-start mr-auto'} max-w-[85%]`}>
                    <div className={`p-2.5 rounded-2xl text-xs ${isDoc ? 'bg-[#C8D9E6] text-[#2F4156] rounded-tr-none' : 'bg-[#F5EFEB] border border-[#C8D9E6]/40 text-[#2F4156] rounded-tl-none'}`}>
                      {isAuto && (
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#567C8D] block mb-1">
                          Soporte Técnico
                        </span>
                      )}
                      <p className="leading-snug">{content}</p>
                    </div>
                    <span className="text-[9px] text-[#2F4156]/50 font-mono mt-1 px-1">{m.time}</span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Message input */}
            <form onSubmit={handleSendChat} className="p-2 border-t border-[#C8D9E6]/30 flex items-center gap-1.5 bg-[#F5EFEB]/20">
              <input
                type="text"
                placeholder="Escriba algo al laboratorio..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 p-2 border border-[#C8D9E6] rounded-xl text-xs bg-white text-[#2F4156] focus:outline-none focus:border-[#567C8D]"
              />
              <button
                type="submit"
                className="p-2 bg-[#2F4156] hover:bg-[#567C8D] text-white rounded-xl transition border-0 outline-none flex items-center justify-center"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────
          PRIOR CONSULTATIONS FOR THIS CASE AT BOTTOM
          ──────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm text-left">
        <h3 className="font-bold text-[#2F4156] text-base border-b border-[#C8D9E6]/30 pb-3 mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-[#567C8D]" />
          Videoconsultas Previas Realizadas para este Caso
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#C8D9E6]/45 text-[#2F4156]/70 uppercase tracking-widest font-black bg-[#F5EFEB]/50">
                <th className="py-2.5 px-3">Fecha</th>
                <th className="py-2.5 px-3">Técnico Dental</th>
                <th className="py-2.5 px-3">Duración</th>
                <th className="py-2.5 px-3">Notas Técnicas Guardadas</th>
                <th className="py-2.5 px-3">Snapshots Adjuntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8D9E6]/25">
              {caseItem.priorCalls.map((call, idx) => (
                <tr key={idx} className="hover:bg-[#C8D9E6]/10 transition-colors">
                  <td className="py-3 px-3 font-mono text-[#2F4156] font-bold">{call.date}</td>
                  <td className="py-3 px-3 font-bold text-[#2F4156]">{call.technician}</td>
                  <td className="py-3 px-3 font-mono font-semibold text-blue-700">{call.duration}m</td>
                  <td className="py-3 px-3 italic text-[#2F4156]/70 max-w-sm truncate">{call.notes}</td>
                  <td className="py-3 px-3 text-emerald-700 font-bold font-mono">
                    {call.snapshots.length} capturas
                  </td>
                </tr>
              ))}
              {caseItem.priorCalls.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-5 text-center text-[#2F4156]/40 italic">
                    No se registran videollamadas previas específicas para este caso. Use el botón superior si tiene dudas de oclusión.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RATING MODAL POPUP FOR SUCCESS GREETING IN MEMORY */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-[#2F4156]/40 backdrop-blur-sm flex justify-center items-center z-50 p-4" id="feedback-modal">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-[#C8D9E6] p-6 text-center space-y-6 animate-fade-in">
            <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto animate-bounce" />
            
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-lg text-[#2F4156]">¡Restauración Recibida!</h3>
              <p className="text-xs text-[#2F4156]/75">
                Por favor, califique la precisión del modelo adaptado para control estadístico de Nova Dental.
              </p>
            </div>

            {/* Stars Row */}
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingScore(star)}
                  className="bg-transparent border-0 outline-none cursor-pointer"
                >
                  <Star className={`w-7 h-7 transition-all ${star <= ratingScore ? 'fill-amber-400 text-amber-500' : 'text-[#C8D9E6]'}`} />
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              placeholder="Comentarios adicionales opcionales..."
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              className="w-full p-2 text-xs border border-[#C8D9E6] rounded-lg focus:outline-none focus:border-[#567C8D]"
            />

            <div className="flex gap-2 pt-2 border-t border-[#C8D9E6]/30">
              <button
                onClick={() => {
                  submitRating();
                  setShowRatingModal(false);
                }}
                className="w-full bg-[#2F4156] hover:bg-[#567C8D] text-white py-2.5 rounded-xl font-bold text-xs shadow border-0"
              >
                Guardar Calificación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
