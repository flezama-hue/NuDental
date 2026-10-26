/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Patient, Case, ScanFile } from '../types';
import { Odontogram } from './Odontogram';
import meshStlImg from '../assets/images/escaneo/04_previsualizacion_malla_stl_3d.png';
import designCadImg from '../assets/images/escaneo/05_preaprobacion_diseno_3d_cad.png';
import catFijas from '../assets/images/categorias/01_protesis_fijas.png';
import catImplante from '../assets/images/categorias/02_soluciones_implante.png';
import catGuardas from '../assets/images/categorias/03_ferulas_guardas_atm.png';
import catOrto from '../assets/images/categorias/04_ortodoncia.png';
import catRemovibles from '../assets/images/categorias/05_protesis_removibles.png';
import catSueno from '../assets/images/categorias/06_sueno_y_accesorios.png';
import catEncerados from '../assets/images/categorias/07_encerados_y_matrices.png';
import catDiagnostico from '../assets/images/categorias/08_escaneo_diagnostico.png';
import subCorona from '../assets/images/restauraciones/01_sub_corona.png';
import subIncrustacion from '../assets/images/restauraciones/02_sub_incrustacion_inlay.png';
import subOnlay from '../assets/images/restauraciones/03_sub_onlay.png';
import subCarilla from '../assets/images/restauraciones/04_sub_carilla_veneer.png';
import subPuente from '../assets/images/restauraciones/05_sub_puente_dental.png';
import scanLowerImg from '../assets/images/escaneo/02_animacion_escaneo_inferior.png';
import scanUpperImg from '../assets/images/escaneo/01_animacion_escaneo_superior.png';
import scanBiteImg from '../assets/images/escaneo/03_animacion_escaneo_mordida.png';
import extraModelo from '../assets/images/extras/01_extra_modelo_impreso.png';
import extraGuardaNocturna from '../assets/images/extras/02_extra_guarda_nocturna.png';
import extraBlanqueamiento from '../assets/images/extras/03_extra_cubeta_blanqueamiento.png';
import extraRetenedor from '../assets/images/extras/04_extra_retenedor_invisible.png';
import extraGuardaDeportiva from '../assets/images/extras/05_extra_guarda_deportiva.png';
import {
  User,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  CheckCircle,
  Box,
  Video,
  Send,
  ScanLine,
  Layers,
  Sparkles,
  Package,
  ClipboardCheck,
  Truck,
  MapPin,
  CalendarClock,
  Zap,
} from 'lucide-react';

interface WizardProps {
  patients: Patient[];
  cases: Case[];
  onAddCase: (newCase: Case) => void;
  onNavigate: (screen: string, caseId?: string) => void;
  onStartInstantVideocall: (caseId?: string) => void;
  selectedPatientFromOtherView?: Patient | null;
  wizardPrefilledDeliveryDate?: string | null;
}

// ── Order categories (Opciones.png). Only Fixed Restorations is active. ──
const CATEGORIES = [
  { key: 'fijas', label: 'Restauraciones Fijas', desc: 'Coronas, puentes, incrustaciones y carillas', active: true, img: catFijas },
  { key: 'implante', label: 'Soluciones de Implante', desc: 'Coronas y puentes sobre implante, guías', active: false, img: catImplante },
  { key: 'guardas', label: 'Férulas, Guardas y ATM', desc: 'Guardas nocturnas, deportivas y ATM', active: false, img: catGuardas },
  { key: 'orto', label: 'Ortodoncia', desc: 'Alineadores transparentes y retenedores', active: false, img: catOrto },
  { key: 'removibles', label: 'Prótesis Removibles', desc: 'Prótesis totales y parciales', active: false, img: catRemovibles },
  { key: 'sueno', label: 'Sueño y Accesorios', desc: 'Apnea del sueño y cubetas de blanqueamiento', active: false, img: catSueno },
  { key: 'encerados', label: 'Encerados y Matrices', desc: 'Wax-up físico, digital y modelo de estudio', active: false, img: catEncerados },
  { key: 'diagnostico', label: 'Escaneo Diagnóstico', desc: 'Muestra al paciente el estado de su boca', active: false, img: catDiagnostico },
];

// ── Fixed restoration subtypes (Protesis fijas.png) ──
const RESTORATION_TYPES = [
  { key: 'Corona', label: 'Corona', desc: 'Restauración unitaria de cobertura total', img: subCorona },
  { key: 'Incrustación', label: 'Incrustación (Inlay)', desc: 'Restauración intracoronaria', img: subIncrustacion },
  { key: 'Onlay', label: 'Onlay', desc: 'Cobertura de cúspides', img: subOnlay },
  { key: 'Carilla', label: 'Carilla (Veneer)', desc: 'Lámina estética del sector anterior', img: subCarilla },
  { key: 'Puente', label: 'Puente', desc: 'Prótesis fija de varias piezas conectadas', img: subPuente },
];

// ── Materials per subtype, mapped to the existing price catalog (PEN, per pieza) ──
type MatOption = { label: string; price: number; product: string };
const MATERIALS_BY_TYPE: Record<string, MatOption[]> = {
  Corona: [
    { label: 'Zirconio', price: 200, product: 'Corona zirconio' },
    { label: 'Metal porcelana', price: 120, product: 'Corona metal porcelana' },
    { label: 'Disilicato de litio (eMax)', price: 300, product: 'Corona disilicato de litio' },
    { label: 'Sobre implante (zirconio)', price: 180, product: 'Corona sobre implante de zirconio' },
  ],
  Incrustación: [
    { label: 'Resina', price: 80, product: 'Incrustación de resina' },
    { label: 'Disilicato de litio', price: 300, product: 'Incrustación de disilicato de litio' },
    { label: 'Zirconio', price: 200, product: 'Incrustación de zirconio' },
  ],
  Onlay: [
    { label: 'Resina', price: 80, product: 'Onlay de resina' },
    { label: 'Disilicato de litio', price: 300, product: 'Onlay de disilicato de litio' },
    { label: 'Zirconio', price: 200, product: 'Onlay de zirconio' },
  ],
  Carilla: [
    { label: 'Zirconio', price: 180, product: 'Carilla de zirconio x pieza' },
    { label: 'Disilicato de litio', price: 250, product: 'Carilla de disilicato de litio x pieza' },
  ],
  Puente: [
    { label: 'Zirconio', price: 200, product: 'Puente de zirconio' },
    { label: 'Metal porcelana', price: 120, product: 'Puente metal porcelana' },
    { label: 'Disilicato de litio', price: 300, product: 'Puente de disilicato de litio' },
  ],
};

const VITA_SHADES = [
  { value: 'A1', label: 'A1 — Muy blanco natural' },
  { value: 'A2', label: 'A2 — Estándar natural dental' },
  { value: 'A3', label: 'A3 — Tono medio natural' },
  { value: 'A3.5', label: 'A3.5 — Dentina intermedia' },
  { value: 'B1', label: 'B1 — Súper estético blanco' },
  { value: 'B2', label: 'B2 — Tono de caras vestibulares' },
  { value: 'C2', label: 'C2 — Tono grisáceo clínico' },
  { value: 'D3', label: 'D3 — Tono canino oscuro' },
];

const EXTRAS = [
  { key: 'Modelo', label: 'Modelo', desc: 'Modelo físico impreso del caso', badge: '', img: extraModelo },
  { key: 'Guarda Nocturna', label: 'Guarda Nocturna', desc: 'Protege la restauración del bruxismo', badge: 'Recomendado', img: extraGuardaNocturna },
  { key: 'Cubeta de Blanqueamiento', label: 'Cubeta de Blanqueamiento', desc: 'Cubeta personalizada para blanqueo', badge: '', img: extraBlanqueamiento },
  { key: 'Retenedor', label: 'Retenedor', desc: 'Mantiene la posición dental', badge: '', img: extraRetenedor },
  { key: 'Guarda Deportiva', label: 'Guarda Deportiva', desc: 'Protección para deportes de contacto', badge: '', img: extraGuardaDeportiva },
];

// ── Rx-specific instructions (Review 1-4) ──
const RX_TABS = ['Contactos', 'Holgura', 'Estética', 'Anatomía', 'Misc'];

const SCAN_STAGES = [
  { key: 'lower', label: 'Arcada Inferior', hint: 'Escanea primero la arcada inferior.', img: scanLowerImg },
  { key: 'upper', label: 'Arcada Superior', hint: 'Ahora la arcada superior.', img: scanUpperImg },
  { key: 'bite', label: 'Mordida', hint: 'Finalmente, registra la mordida en oclusión.', img: scanBiteImg },
];

const TOTAL_STEPS = 13;
const phaseOf = (step: number) => (step <= 6 ? 'Caso' : step <= 8 ? 'Escaneo' : 'Orden');

export const Wizard: React.FC<WizardProps> = ({
  patients,
  cases,
  onAddCase,
  onNavigate,
  onStartInstantVideocall,
  selectedPatientFromOtherView = null,
  wizardPrefilledDeliveryDate = null,
}) => {
  const [currentStep, setCurrentStep] = useState(1);

  // STEP 1 — Patient
  const [useExistingPatient, setUseExistingPatient] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    selectedPatientFromOtherView?.id || patients[0]?.id || ''
  );
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientBirth, setNewPatientBirth] = useState('1990-01-01');
  const [newPatientGender, setNewPatientGender] = useState<'Masculino' | 'Femenino' | 'Otro'>('Femenino');

  // STEP 2-3 — Category & restoration type
  const [category, setCategory] = useState<string>('');
  const [restorationType, setRestorationType] = useState<string>('');

  // STEP 4-6 — Teeth, material, shade
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [isBridge, setIsBridge] = useState(false);
  const [materialIdx, setMaterialIdx] = useState<number | null>(null);
  const [vitaShade, setVitaShade] = useState('A2');

  // STEP 7 — Scan
  const [scanStageIdx, setScanStageIdx] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDone, setScanDone] = useState<boolean[]>([false, false, false]);

  // STEP 9 — Extras
  const [extras, setExtras] = useState<string[]>([]);

  // STEP 11 — Design pre-approval
  const [preApprove, setPreApprove] = useState<boolean | null>(null);

  // STEP 12 — Rx instructions
  const [rxTab, setRxTab] = useState('Contactos');
  const [rx, setRx] = useState<Record<string, string>>({
    contactosOclusal: 'Ligero',
    contactosProximal: 'Medio',
    holgura: 'Si ≤ 0.5mm, reducir antagonista; sino, llamar al Dr.',
    estetica: 'Media',
    anatomia: 'Seguir anatomía adyacente/contralateral',
    misc: '',
  });

  // STEP 13 — Checkout
  const [requestingDoctor, setRequestingDoctor] = useState('Dr. García');
  const [shippingAddress, setShippingAddress] = useState('Av. Javier Prado 123, San Isidro, Lima');
  const [deliveryDate, setDeliveryDate] = useState(wizardPrefilledDeliveryDate || '2026-06-12');
  const [urgency, setUrgency] = useState<'estandar' | 'express'>('estandar');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (selectedPatientFromOtherView) {
      setUseExistingPatient(true);
      setSelectedPatientId(selectedPatientFromOtherView.id);
    }
  }, [selectedPatientFromOtherView]);

  useEffect(() => {
    if (wizardPrefilledDeliveryDate) setDeliveryDate(wizardPrefilledDeliveryDate);
  }, [wizardPrefilledDeliveryDate]);

  // ── Derived data ──
  const activePatient = useExistingPatient
    ? patients.find((p) => p.id === selectedPatientId)
    : newPatientName.trim()
    ? { id: 'P-NEW', name: newPatientName.trim() }
    : null;

  const materialOptions = restorationType ? MATERIALS_BY_TYPE[restorationType] || [] : [];
  const selectedMaterial = materialIdx != null ? materialOptions[materialIdx] : null;
  const pieceCount = Math.max(selectedTeeth.length, 1);
  const unitPrice = selectedMaterial?.price ?? 0;
  const totalPrice = unitPrice * pieceCount;
  const fmtPen = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(patientSearch.trim().toLowerCase()) ||
    (p.internalId || '').toLowerCase().includes(patientSearch.trim().toLowerCase())
  );

  const designImage = designCadImg;

  // ── Scan simulation ──
  const runScan = () => {
    const stage = scanStageIdx;
    let p = 0;
    setScanning(true);
    setScanProgress(0);
    const iv = setInterval(() => {
      p += 10;
      setScanProgress(p);
      if (p >= 100) {
        clearInterval(iv);
        setScanning(false);
        setScanDone((d) => { const n = [...d]; n[stage] = true; return n; });
        setScanStageIdx((i) => (stage < SCAN_STAGES.length - 1 ? stage + 1 : i));
      }
    }, 120);
  };
  const allScanned = scanDone.every(Boolean);

  // ── Step gating ──
  const canContinue = (): boolean => {
    switch (currentStep) {
      case 1: return useExistingPatient ? !!selectedPatientId : !!newPatientName.trim();
      case 2: return category === 'fijas';
      case 3: return !!restorationType;
      case 4: return selectedTeeth.length > 0;
      case 5: return materialIdx != null;
      case 6: return !!vitaShade;
      case 7: return allScanned;
      case 8: return true;
      case 9: return true;
      case 10: return true;
      case 11: return preApprove != null;
      case 12: return true;
      case 13: return !!requestingDoctor.trim() && !!shippingAddress.trim();
      default: return true;
    }
  };

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

  // ── Submit / generate order ──
  const generateOrder = () => {
    setSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const files: ScanFile[] = [
      { name: 'ESCANEO_INFERIOR.ply', size: '12.4 MB', date: today, type: 'ply' },
      { name: 'ESCANEO_SUPERIOR.ply', size: '13.1 MB', date: today, type: 'ply' },
      { name: 'REGISTRO_MORDIDA.ply', size: '6.8 MB', date: today, type: 'ply' },
    ];
    const status: Case['status'] = preApprove
      ? 'Aprobación de diseño'
      : urgency === 'express'
      ? 'En producción'
      : 'Enviado';

    const newCase: Case = {
      id: '#' + (cases.length + 38).toString().padStart(3, '0'),
      patientId: activePatient?.id || 'P-NEW',
      patientName: activePatient?.name || 'Paciente Nuevo',
      caseName: `NOVA-${(activePatient?.name || 'PACIENTE').split(' ')[0].toUpperCase()}-${selectedTeeth.join('-')}`,
      sentDate: today,
      deliveryDate,
      status,
      urgency,
      teeth: selectedTeeth,
      isBridge,
      product: selectedMaterial?.product || `${restorationType}`,
      price: totalPrice,
      paymentStatus: 'pendiente',
      material: selectedMaterial?.label || '',
      shade: vitaShade,
      instructions: rx.misc || `${restorationType} en ${selectedMaterial?.label}. Tono ${vitaShade}.`,
      files,
      aiReview: { completeScan: true, underCutWarning: false, occlusalSpace: true, marginWarning: false },
      rating: null,
      chat: [],
      priorCalls: [],
      category: 'Restauraciones Fijas',
      restorationType,
      extras,
      rxInstructions: rx,
      requestingDoctor,
      shippingAddress,
      preApproveDesign: !!preApprove,
      ...(preApprove
        ? { designApproval: { sentDate: today, modelLabel: `DISEÑO_CAD_3D_${(cases.length + 38)}`, status: 'pendiente' as const } }
        : {}),
    };

    setTimeout(() => {
      onAddCase(newCase);
      setSubmitting(false);
      setSuccess(true);
      setTimeout(() => onNavigate('Casos'), 1600);
    }, 1400);
  };

  // ── Small UI helpers ──
  const Radio: React.FC<{ checked: boolean; label: string; onClick: () => void }> = ({ checked, label, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 text-left px-3 py-2 rounded-xl border text-xs font-semibold transition ${
        checked ? 'bg-[#C8D9E6]/40 border-[#2F4156] text-[#2F4156]' : 'bg-white border-[#C8D9E6] text-[#2F4156]/70 hover:bg-[#F5EFEB]'
      }`}
    >
      <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${checked ? 'border-[#2F4156] bg-[#2F4156]' : 'border-[#C8D9E6]'}`} />
      {label}
    </button>
  );

  // ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" id="wizard-container">
      {/* Phase header */}
      <div className="bg-white p-5 rounded-2xl border border-[#C8D9E6]/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-[#2F4156]">Nueva Orden Clínica</h1>
          <span className="text-[11px] font-bold text-[#567C8D] bg-[#F5EFEB] border border-[#C8D9E6] px-2.5 py-1 rounded-lg">
            Paso {currentStep} de {TOTAL_STEPS}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Caso', 'Escaneo', 'Orden'].map((ph) => {
            const active = phaseOf(currentStep) === ph;
            const done =
              (ph === 'Caso' && currentStep > 6) || (ph === 'Escaneo' && currentStep > 8);
            return (
              <div
                key={ph}
                className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition ${
                  active
                    ? 'bg-[#2F4156] text-white border-[#2F4156]'
                    : done
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-[#F5EFEB] text-[#2F4156]/50 border-[#C8D9E6]/50'
                }`}
              >
                {done && <Check className="w-3.5 h-3.5" />}
                {ph}
              </div>
            );
          })}
        </div>
      </div>

      {submitting && (
        <div className="bg-white p-12 rounded-2xl border border-[#C8D9E6]/50 shadow-lg text-center space-y-4 max-w-md mx-auto">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-[#C8D9E6]/25 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-transparent border-[#2F4156] rounded-full animate-spin" />
          </div>
          <h3 className="font-bold text-lg text-[#2F4156]">Generando orden clínica…</h3>
          <p className="text-xs text-[#2F4156]/70">Enviando archivos y registrando el caso en el laboratorio de Lima.</p>
        </div>
      )}

      {success && (
        <div className="bg-white p-12 rounded-2xl border border-[#C8D9E6]/50 shadow-lg text-center space-y-4 max-w-md mx-auto">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
          <h3 className="font-bold text-lg text-[#2F4156]">¡Orden generada con éxito!</h3>
          <p className="text-xs text-[#2F4156]/70">Redirigiendo al listado de casos…</p>
        </div>
      )}

      {!submitting && !success && (
        <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-md min-h-[380px]">
          {/* STEP 1 — PATIENT */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg flex items-center gap-2"><User className="w-5 h-5 text-[#567C8D]" /> Paso 1: Paciente</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Selecciona un paciente del directorio o registra uno nuevo.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setUseExistingPatient(true)} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${useExistingPatient ? 'bg-[#2F4156] text-white border-[#2F4156]' : 'bg-white text-[#2F4156] border-[#C8D9E6]'}`}>Del directorio</button>
                <button onClick={() => setUseExistingPatient(false)} className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${!useExistingPatient ? 'bg-[#2F4156] text-white border-[#2F4156]' : 'bg-white text-[#2F4156] border-[#C8D9E6]'}`}>Paciente nuevo</button>
              </div>

              {useExistingPatient ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-[#567C8D]" />
                    <input value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} placeholder="Buscar por nombre o historia clínica…" className="w-full pl-9 pr-3 py-2.5 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D]" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto">
                    {filteredPatients.map((p) => (
                      <button key={p.id} onClick={() => setSelectedPatientId(p.id)} className={`text-left p-3 rounded-xl border transition ${selectedPatientId === p.id ? 'bg-[#C8D9E6]/40 border-[#2F4156]' : 'bg-white border-[#C8D9E6] hover:bg-[#F5EFEB]'}`}>
                        <span className="font-bold text-sm text-[#2F4156] block">{p.name}</span>
                        <span className="text-[10px] text-[#2F4156]/60 font-mono">{p.internalId} · {p.gender}</span>
                      </button>
                    ))}
                    {filteredPatients.length === 0 && <p className="text-xs text-[#2F4156]/50 col-span-2 py-6 text-center">Sin coincidencias.</p>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#2F4156]/70 uppercase tracking-wider mb-1">Nombre completo *</label>
                    <input value={newPatientName} onChange={(e) => setNewPatientName(e.target.value)} placeholder="Nombre del paciente" className="w-full p-2.5 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2F4156]/70 uppercase tracking-wider mb-1">Fecha de nacimiento</label>
                    <input type="date" value={newPatientBirth} onChange={(e) => setNewPatientBirth(e.target.value)} className="w-full p-2.5 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2F4156]/70 uppercase tracking-wider mb-1">Género</label>
                    <select value={newPatientGender} onChange={(e) => setNewPatientGender(e.target.value as any)} className="w-full p-2.5 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] bg-white focus:outline-none focus:border-[#567C8D]">
                      <option>Femenino</option><option>Masculino</option><option>Otro</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — CATEGORY */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg">Paso 2: ¿Qué deseas ordenar?</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Elige la categoría del trabajo.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    disabled={!c.active}
                    onClick={() => c.active && setCategory(c.key)}
                    className={`text-left p-4 rounded-xl border transition relative ${
                      category === c.key ? 'bg-[#C8D9E6]/40 border-[#2F4156] ring-1 ring-[#2F4156]' : c.active ? 'bg-white border-[#C8D9E6] hover:bg-[#F5EFEB]' : 'bg-[#F5EFEB]/40 border-[#C8D9E6]/40 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    {!c.active && <span className="absolute top-2 right-2 text-[8px] font-bold bg-[#2F4156]/10 text-[#2F4156]/60 px-1.5 py-0.5 rounded z-10">Próximamente</span>}
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-[#F5EFEB] mb-2.5 border border-[#C8D9E6]/30">
                      <img src={c.img} alt={c.label} className="w-full h-full object-contain" />
                    </div>
                    <span className="font-bold text-xs text-[#2F4156] block">{c.label}</span>
                    <span className="text-[10px] text-[#2F4156]/55 leading-tight block mt-0.5">{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3 — RESTORATION TYPE */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg">Paso 3: Tipo de restauración fija</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">¿Qué deseas ordenar dentro de Restauraciones Fijas?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {RESTORATION_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setRestorationType(t.key); setMaterialIdx(null); setIsBridge(t.key === 'Puente'); }}
                    className={`text-left p-4 rounded-xl border transition flex items-center gap-3 ${restorationType === t.key ? 'bg-[#C8D9E6]/40 border-[#2F4156] ring-1 ring-[#2F4156]' : 'bg-white border-[#C8D9E6] hover:bg-[#F5EFEB]'}`}
                  >
                    <span className="w-14 h-14 rounded-lg overflow-hidden bg-[#F5EFEB] border border-[#C8D9E6]/30 flex-shrink-0">
                      <img src={t.img} alt={t.label} className="w-full h-full object-cover" />
                    </span>
                    <span>
                      <span className="font-bold text-sm text-[#2F4156] block">{t.label}</span>
                      <span className="text-[10px] text-[#2F4156]/55 leading-tight block">{t.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 — ODONTOGRAM */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg">Paso 4: Selecciona la(s) pieza(s)</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Marca en el odontograma las piezas a trabajar.</p>
              </div>
              <Odontogram selectedTeeth={selectedTeeth} onChange={setSelectedTeeth} isBridge={isBridge} onBridgeToggle={setIsBridge} />
            </div>
          )}

          {/* STEP 5 — MATERIAL */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg">Paso 5: Material</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Elige el material para {restorationType} ({pieceCount} {pieceCount === 1 ? 'pieza' : 'piezas'}).</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {materialOptions.map((m, i) => (
                  <button key={m.label} onClick={() => setMaterialIdx(i)} className={`text-left p-4 rounded-xl border transition ${materialIdx === i ? 'bg-[#C8D9E6]/40 border-[#2F4156] ring-1 ring-[#2F4156]' : 'bg-white border-[#C8D9E6] hover:bg-[#F5EFEB]'}`}>
                    <span className="font-bold text-sm text-[#2F4156] block">{m.label}</span>
                    <span className="text-xs text-[#567C8D] font-mono font-bold block mt-1">{fmtPen(m.price)} <span className="text-[#2F4156]/50 font-sans">/ pieza</span></span>
                  </button>
                ))}
              </div>
              {selectedMaterial && (
                <div className="flex justify-between items-center bg-[#F5EFEB]/50 border border-[#C8D9E6]/40 rounded-xl px-4 py-3 text-sm">
                  <span className="text-[#2F4156]/70 font-semibold">{fmtPen(unitPrice)} × {pieceCount} {pieceCount === 1 ? 'pieza' : 'piezas'}</span>
                  <span className="font-extrabold text-[#2F4156] font-mono">Total: {fmtPen(totalPrice)}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 6 — SHADE */}
          {currentStep === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#567C8D]" /> Paso 6: Tono (Guía VITA)</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Selecciona el tono de la restauración.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {VITA_SHADES.map((s) => (
                  <button key={s.value} onClick={() => setVitaShade(s.value)} className={`text-left p-3 rounded-xl border transition ${vitaShade === s.value ? 'bg-[#C8D9E6]/40 border-[#2F4156] ring-1 ring-[#2F4156]' : 'bg-white border-[#C8D9E6] hover:bg-[#F5EFEB]'}`}>
                    <span className="font-extrabold text-[#2F4156] font-mono block">{s.value}</span>
                    <span className="text-[9px] text-[#2F4156]/55 leading-tight block mt-0.5">{s.label.split('—')[1]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7 — SCAN */}
          {currentStep === 7 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg flex items-center gap-2"><ScanLine className="w-5 h-5 text-[#567C8D]" /> Paso 7: Escaneo del paciente</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Escanea en orden: inferior, superior y mordida.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SCAN_STAGES.map((s, i) => (
                  <div key={s.key} className={`p-3 rounded-xl border text-center text-xs font-bold ${scanDone[i] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : i === scanStageIdx ? 'bg-[#2F4156] text-white border-[#2F4156]' : 'bg-[#F5EFEB] text-[#2F4156]/50 border-[#C8D9E6]/50'}`}>
                    {scanDone[i] ? <Check className="w-4 h-4 mx-auto mb-1" /> : <span className="block text-base mb-0.5">{i + 1}</span>}
                    {s.label}
                  </div>
                ))}
              </div>
              <div className="relative w-full max-w-md mx-auto aspect-square bg-[#2F4156] rounded-xl overflow-hidden flex flex-col justify-center items-center text-white p-6 text-center">
                {/* Current arch/bite image (square, fills the frame) */}
                {!allScanned && (
                  <img
                    src={SCAN_STAGES[scanStageIdx].img}
                    alt={SCAN_STAGES[scanStageIdx].label}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-[#2F4156]/40" />
                <div className="absolute inset-0 bg-[radial-gradient(#567C8D_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
                {allScanned ? (
                  <div className="z-10 space-y-2">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h4 className="font-bold">Escaneo completo</h4>
                    <p className="text-xs text-white/70 max-w-sm">Inferior, superior y mordida capturados correctamente.</p>
                  </div>
                ) : scanning ? (
                  <div className="z-10 space-y-3">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-[#C8D9E6] animate-spin" />
                    </div>
                    <span className="block font-bold drop-shadow">Escaneando {SCAN_STAGES[scanStageIdx].label}…</span>
                    <div className="w-56 mx-auto bg-white/20 h-1.5 rounded-full overflow-hidden"><div className="bg-[#C8D9E6] h-full" style={{ width: `${scanProgress}%` }} /></div>
                    <span className="font-mono text-xs text-[#C8D9E6]">{scanProgress}%</span>
                  </div>
                ) : (
                  <div className="z-10 space-y-3">
                    <h4 className="font-bold text-lg drop-shadow">{SCAN_STAGES[scanStageIdx].label}</h4>
                    <p className="text-xs text-white/80 max-w-sm drop-shadow">{SCAN_STAGES[scanStageIdx].hint}</p>
                    <button onClick={runScan} className="bg-[#C8D9E6] text-[#2F4156] hover:bg-white px-5 py-2.5 rounded-xl text-xs font-bold border-0 mt-1 shadow-lg">
                      Escanear {SCAN_STAGES[scanStageIdx].label}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 8 — MODEL REVIEW */}
          {currentStep === 8 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg flex items-center gap-2"><Layers className="w-5 h-5 text-[#567C8D]" /> Paso 8: Revisión del modelo</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Verifica el modelo 3D escaneado antes de continuar.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="relative aspect-video bg-[#2F4156] rounded-xl overflow-hidden">
                  <img src={meshStlImg} alt="Modelo escaneado" className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 right-2 text-[9px] text-white bg-black/55 p-1 rounded font-mono text-center">Modelo 3D · Nova Dental IOS</span>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-[#2F4156]/75 leading-relaxed">¿Dudas sobre los límites de escaneo o la preparación? Habla con un técnico senior en vivo.</p>
                  <button onClick={() => onStartInstantVideocall()} className="bg-[#567C8D] hover:bg-[#2F4156] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border-0 transition">
                    <Video className="w-4 h-4" /> Videollamada con Técnico Senior
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 9 — EXTRAS */}
          {currentStep === 9 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg flex items-center gap-2"><Package className="w-5 h-5 text-[#567C8D]" /> Paso 9: ¿Algo más?</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Agrega extras opcionales a tu orden.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {EXTRAS.map((ex) => {
                  const on = extras.includes(ex.key);
                  return (
                    <button key={ex.key} onClick={() => setExtras((p) => on ? p.filter((x) => x !== ex.key) : [...p, ex.key])} className={`text-left p-4 rounded-xl border transition relative ${on ? 'bg-[#C8D9E6]/40 border-[#2F4156] ring-1 ring-[#2F4156]' : 'bg-white border-[#C8D9E6] hover:bg-[#F5EFEB]'}`}>
                      {ex.badge && <span className="absolute top-2 right-2 text-[8px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded z-10">{ex.badge}</span>}
                      <span className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center z-10 ${on ? 'bg-[#2F4156] border-[#2F4156]' : 'bg-white border-[#C8D9E6]'}`}>{on && <Check className="w-3.5 h-3.5 text-white" />}</span>
                      <div className="w-full aspect-video rounded-lg overflow-hidden bg-[#F5EFEB] mb-2.5 border border-[#C8D9E6]/30">
                        <img src={ex.img} alt={ex.label} className="w-full h-full object-cover" />
                      </div>
                      <span className="font-bold text-sm text-[#2F4156] block">{ex.label}</span>
                      <span className="text-[10px] text-[#2F4156]/55 leading-tight block mt-0.5">{ex.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 10 — VALIDATE ITEM */}
          {currentStep === 10 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-[#567C8D]" /> Paso 10: Validar ítem</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Confirma los datos del trabajo y los extras seleccionados.</p>
              </div>
              <div className="bg-[#F5EFEB]/40 border border-[#C8D9E6]/40 rounded-xl p-5 space-y-2.5 text-sm">
                {[
                  ['Restauración', `${restorationType} — ${selectedMaterial?.label || ''}`],
                  ['Pieza(s) FDI', `${selectedTeeth.join(', ')}${isBridge ? ' (Puente)' : ''}`],
                  ['Tono', `VITA ${vitaShade}`],
                  ['Precio', `${fmtPen(unitPrice)} × ${pieceCount} = ${fmtPen(totalPrice)}`],
                  ['Extras', extras.length ? extras.join(', ') : 'Ninguno'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-[#C8D9E6]/30 pb-2 last:border-0">
                    <span className="text-[#2F4156]/60 font-semibold">{k}</span>
                    <span className="font-bold text-[#2F4156] text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 11 — DESIGN PRE-APPROVAL */}
          {currentStep === 11 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg flex items-center gap-2"><Box className="w-5 h-5 text-[#567C8D]" /> Paso 11: Preaprobación del diseño</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">¿Deseas revisar y aprobar el diseño 3D antes de fabricarlo?</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
                <div className="relative aspect-video bg-[#2F4156] rounded-xl overflow-hidden">
                  <img src={designImage} alt="Diseño 3D" className="absolute inset-0 w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 right-2 text-[9px] text-white bg-black/55 p-1 rounded font-mono text-center">Vista previa del diseño CAD</span>
                </div>
                <div className="space-y-3">
                  <button onClick={() => setPreApprove(true)} className={`w-full text-left p-4 rounded-xl border transition ${preApprove === true ? 'bg-[#C8D9E6]/40 border-[#2F4156] ring-1 ring-[#2F4156]' : 'bg-white border-[#C8D9E6] hover:bg-[#F5EFEB]'}`}>
                    <span className="font-bold text-sm text-[#2F4156] block">Sí, agregar preview de diseño</span>
                    <span className="text-[11px] text-[#2F4156]/60 leading-relaxed block mt-0.5">Recibirás el diseño 3D en ~24h para aprobarlo o rechazarlo antes de producir.</span>
                  </button>
                  <button onClick={() => setPreApprove(false)} className={`w-full text-left p-4 rounded-xl border transition ${preApprove === false ? 'bg-[#C8D9E6]/40 border-[#2F4156] ring-1 ring-[#2F4156]' : 'bg-white border-[#C8D9E6] hover:bg-[#F5EFEB]'}`}>
                    <span className="font-bold text-sm text-[#2F4156] block">No, proceder directo</span>
                    <span className="text-[11px] text-[#2F4156]/60 leading-relaxed block mt-0.5">El laboratorio fabrica sin paso de aprobación previa.</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 12 — REVIEW (Rx instructions) */}
          {currentStep === 12 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg">Paso 12: Revisión e instrucciones Rx</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">{restorationType} {selectedTeeth.join(', ')} · {selectedMaterial?.label} · VITA {vitaShade}</p>
              </div>
              <div className="flex gap-1.5 flex-wrap border-b border-[#C8D9E6]/40 pb-2">
                {RX_TABS.map((t) => (
                  <button key={t} onClick={() => setRxTab(t)} className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${rxTab === t ? 'bg-[#2F4156] text-white' : 'text-[#2F4156] hover:bg-[#F5EFEB]'}`}>{t}</button>
                ))}
              </div>

              <div className="space-y-4">
                {rxTab === 'Contactos' && (
                  <>
                    <div>
                      <p className="text-xs font-bold text-[#2F4156] mb-2">¿Qué tan ajustados los contactos oclusales?</p>
                      <div className="flex flex-wrap gap-2">{['Fuerte', 'Medio', 'Ligero', 'Ninguno (abierto)'].map((o) => <Radio key={o} checked={rx.contactosOclusal === o} label={o} onClick={() => setRx((r) => ({ ...r, contactosOclusal: o }))} />)}</div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#2F4156] mb-2">¿Qué tan ajustados los contactos proximales?</p>
                      <div className="flex flex-wrap gap-2">{['Ajustado', 'Medio', 'Ligero'].map((o) => <Radio key={o} checked={rx.contactosProximal === o} label={o} onClick={() => setRx((r) => ({ ...r, contactosProximal: o }))} />)}</div>
                    </div>
                  </>
                )}
                {rxTab === 'Holgura' && (
                  <div>
                    <p className="text-xs font-bold text-[#2F4156] mb-2">¿Qué hacer si no hay holgura oclusal?</p>
                    <div className="flex flex-col gap-2">{['Si ≤ 0.5mm, reducir antagonista; sino, llamar al Dr.', 'Llamar al Dr. ante cualquier problema de holgura'].map((o) => <Radio key={o} checked={rx.holgura === o} label={o} onClick={() => setRx((r) => ({ ...r, holgura: o }))} />)}</div>
                  </div>
                )}
                {rxTab === 'Estética' && (
                  <div>
                    <p className="text-xs font-bold text-[#2F4156] mb-2">¿Preferencia de tinción oclusal?</p>
                    <div className="flex flex-wrap gap-2">{['Oscura (incluye anatomía secundaria)', 'Media', 'Ligera', 'Sin tinción'].map((o) => <Radio key={o} checked={rx.estetica === o} label={o} onClick={() => setRx((r) => ({ ...r, estetica: o }))} />)}</div>
                  </div>
                )}
                {rxTab === 'Anatomía' && (
                  <div>
                    <p className="text-xs font-bold text-[#2F4156] mb-2">¿Qué priorizar al diseñar la anatomía?</p>
                    <div className="flex flex-col gap-2">{['Seguir anatomía adyacente/contralateral', 'Crear anatomía ideal/nueva (si la oclusión lo permite)'].map((o) => <Radio key={o} checked={rx.anatomia === o} label={o} onClick={() => setRx((r) => ({ ...r, anatomia: o }))} />)}</div>
                  </div>
                )}
                {rxTab === 'Misc' && (
                  <div>
                    <p className="text-xs font-bold text-[#2F4156] mb-2">Nota para el técnico</p>
                    <textarea rows={4} value={rx.misc} onChange={(e) => setRx((r) => ({ ...r, misc: e.target.value }))} placeholder="Instrucciones adicionales específicas para este caso…" className="w-full p-3 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D]" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 13 — CHECKOUT */}
          {currentStep === 13 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-bold text-[#2F4156] text-lg flex items-center gap-2"><Truck className="w-5 h-5 text-[#567C8D]" /> Paso 13: Confirmar y enviar</h2>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Revisa el resumen y completa los datos de envío.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#2F4156]/70 uppercase tracking-wider mb-1">Doctor solicitante *</label>
                    <input value={requestingDoctor} onChange={(e) => setRequestingDoctor(e.target.value)} className="w-full p-2.5 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2F4156]/70 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Dirección de envío *</label>
                    <input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full p-2.5 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2F4156]/70 uppercase tracking-wider mb-1 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Fecha requerida</label>
                    <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full p-2.5 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setUrgency('estandar')} className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition ${urgency === 'estandar' ? 'bg-[#2F4156] text-white border-[#2F4156]' : 'bg-white text-[#2F4156] border-[#C8D9E6]'}`}>Estándar</button>
                    <button onClick={() => setUrgency('express')} className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1 ${urgency === 'express' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-[#2F4156] border-[#C8D9E6]'}`}><Zap className="w-3.5 h-3.5" /> Exprés (+S/ 50)</button>
                  </div>
                </div>

                <div className="bg-[#F5EFEB]/40 border border-[#C8D9E6]/40 rounded-xl p-5 space-y-2 text-sm">
                  <h4 className="font-bold text-[#2F4156] text-xs uppercase tracking-wider border-b border-[#C8D9E6]/30 pb-2">Resumen de la orden</h4>
                  {[
                    ['Paciente', activePatient?.name || '—'],
                    ['Restauración', `${restorationType} — ${selectedMaterial?.label || ''}`],
                    ['Pieza(s)', `${selectedTeeth.join(', ')}${isBridge ? ' (Puente)' : ''}`],
                    ['Tono', `VITA ${vitaShade}`],
                    ['Extras', extras.length ? extras.join(', ') : 'Ninguno'],
                    ['Preaprobación 3D', preApprove ? 'Sí (24h)' : 'No'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs"><span className="text-[#2F4156]/60 font-semibold">{k}</span><span className="font-bold text-[#2F4156] text-right max-w-[60%]">{v}</span></div>
                  ))}
                  <div className="flex justify-between border-t border-[#C8D9E6]/40 pt-2 mt-1">
                    <span className="text-[#2F4156] font-bold">Total</span>
                    <span className="font-extrabold text-[#2F4156] font-mono">{fmtPen(totalPrice + (urgency === 'express' ? 50 : 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION */}
          <div className="flex justify-between items-center pt-6 mt-6 border-t border-[#C8D9E6]/30">
            <button onClick={goBack} disabled={currentStep === 1} className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-transparent text-[#2F4156] border border-[#C8D9E6] hover:bg-[#F5EFEB]'}`}>
              <ChevronLeft className="w-4 h-4" /> Paso Anterior
            </button>
            {currentStep < TOTAL_STEPS ? (
              <button onClick={goNext} disabled={!canContinue()} className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition border-0 shadow ${canContinue() ? 'bg-[#2F4156] text-white hover:bg-[#567C8D]' : 'bg-[#C8D9E6]/50 text-[#2F4156]/40 cursor-not-allowed'}`}>
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={generateOrder} disabled={!canContinue()} className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition border-0 shadow ${canContinue() ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-[#C8D9E6]/50 text-[#2F4156]/40 cursor-not-allowed'}`}>
                <Send className="w-4 h-4" /> Generar orden
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
