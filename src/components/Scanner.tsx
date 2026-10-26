/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Radio, BookOpen, FileText, Download, Cable, ShieldCheck, LifeBuoy } from 'lucide-react';
import scannerImg from '../assets/images/scanner-ios.png';

// Bundled device image (imported so Vite includes it in the production build).
const SCANNER_IMAGE_PATH = scannerImg;

// Spec rows reused for the on-screen grid and the downloadable datasheet.
const SPECS: { label: string; value: string }[] = [
  { label: 'Veracidad (Trueness)', value: '≤ 10 µm' },
  { label: 'Campo Visual (FOV)', value: '17 × 15 mm' },
  { label: 'Peso ultra-ligero', value: '210 gramos' },
  { label: 'Velocidad Arcada', value: '< 2 min' },
  { label: 'Filtrado AI de tejido', value: 'On-device active' },
  { label: 'Ecosistema Abierto', value: 'STL / PLY / OBJ' },
  { label: 'Conexión', value: 'Cableada USB-C (10 Gbps)' },
  { label: 'Modelo oficial', value: 'ND-IOS #ND-0042' },
];

export const Scanner: React.FC = () => {
  // Generate and download a simple text document (manual / datasheet).
  const downloadDoc = (filename: string, lines: string[]) => {
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadDatasheet = () =>
    downloadDoc('Ficha-Tecnica-Nova-Dental-IOS.txt', [
      'NOVA DENTAL IOS — FICHA TÉCNICA',
      'Escáner Intraoral · Modelo ND-IOS #ND-0042',
      '====================================================',
      '',
      ...SPECS.map((s) => `${s.label}: ${s.value}`),
      '',
      'Notas:',
      '- Tecnología de escaneado óptico 3D de alta velocidad.',
      '- Captura preparaciones, antagonistas y registros de mordida.',
      '- Envío directo al laboratorio sin correspondencia física.',
    ]);

  const downloadManual = () =>
    downloadDoc('Manual-de-Uso-Nova-Dental-IOS.txt', [
      'NOVA DENTAL IOS — MANUAL DE USO',
      'Escáner Intraoral · Modelo ND-IOS #ND-0042',
      '====================================================',
      '',
      '1. PREPARACIÓN',
      '   - Conecte el cabezal a la consola mediante el cable USB-C.',
      '   - Verifique que la punta esté esterilizada y colocada firmemente.',
      '   - Encienda la consola y espere el indicador "Conectado".',
      '',
      '2. CAPTURA',
      '   - Seque la zona y mantenga el campo libre de saliva.',
      '   - Inicie por la arcada superior, luego inferior y la mordida.',
      '   - Mueva el escáner lento y continuo siguiendo la guía en pantalla.',
      '',
      '3. ENVÍO',
      '   - Revise la malla generada (STL/PLY/OBJ).',
      '   - Adjunte el escaneo al caso desde "Nuevo caso".',
      '',
      '4. CUIDADO Y MANTENIMIENTO',
      '   - Esterilice la punta tras cada paciente.',
      '   - Limpie las lentes con paño de microfibra seco.',
      '   - No desconecte el cable durante una captura activa.',
      '',
      'Soporte técnico: 01 234-5678 · soporte@novadental.pe',
    ]);

  return (
    <div className="space-y-6" id="scanner-landing">
      {/* Hero banner & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white p-6 md:p-8 rounded-2xl border border-[#C8D9E6]/50 shadow-md">
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-black border border-emerald-200">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            Conectado — Nova Dental IOS #ND-0042
          </div>

          <h1 className="text-3xl font-extrabold text-[#2F4156] tracking-tight">
            Escáner Intraoral Nova Dental IOS
          </h1>
          <p className="text-sm md:text-base text-[#2F4156]/75 leading-relaxed">
            Nuestra tecnología bandera de escaneado óptico 3D de alta velocidad.
            Permite capturar preparaciones, antagonistas y registros de mordida con precisión submicrónica,
            enviándolos directo al laboratorio sin intermediarios ni demoras de correspondencia física.
          </p>

          {/* Quick specs grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
            {SPECS.slice(0, 6).map((s) => (
              <div key={s.label} className="p-3 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/30 text-left">
                <span className="text-[10px] font-bold text-[#567C8D] uppercase tracking-wider block">{s.label}</span>
                <span className="text-sm font-extrabold text-[#2F4156] mt-0.5 block">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Device image */}
        <div className="lg:col-span-5 flex justify-center flex-col items-center space-y-4">
          <div className="relative group overflow-hidden rounded-2xl border-2 border-[#C8D9E6] shadow-sm max-w-[280px] bg-[#F5EFEB]/20 p-2">
            <img
              src={SCANNER_IMAGE_PATH}
              alt="Nova Dental IOS Device"
              className="rounded-xl w-full h-auto object-cover transform hover:scale-102 transition duration-300"
              referrerPolicy="no-referrer"
              id="nova-dental-ios-image-graphic"
            />
            <span className="absolute bottom-4 left-4 bg-[#2F4156] text-white text-[9px] font-bold tracking-widest px-2.5 py-1 rounded shadow uppercase">
              Nova Dental IOS Scanner
            </span>
          </div>
          <p className="text-[11px] text-[#2F4156]/50 italic max-w-xs text-center font-medium flex items-center gap-1.5">
            <Cable className="w-3.5 h-3.5 text-[#567C8D]" />
            Modelo oficial ND-IOS #ND-0042. Conexión cableada (USB-C) a la consola clínica.
          </p>
        </div>
      </div>

      {/* Quick access: documentation */}
      <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-md space-y-4">
        <div className="border-b border-[#C8D9E6]/30 pb-3">
          <h3 className="font-bold text-[#2F4156] text-lg">Documentación y recursos</h3>
          <p className="text-xs text-[#2F4156]/60 mt-0.5">
            Acceso rápido al manual de uso y la ficha técnica del escáner.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Manual de uso */}
          <div className="p-5 bg-[#F5EFEB]/40 rounded-xl border border-[#C8D9E6]/40 flex items-start gap-4">
            <span className="p-3 bg-[#2F4156] text-[#C8D9E6] rounded-xl flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </span>
            <div className="flex-1">
              <h4 className="font-bold text-[#2F4156] text-sm">Manual de uso</h4>
              <p className="text-xs text-[#2F4156]/60 mt-0.5 leading-relaxed">
                Guía paso a paso de preparación, captura, envío y mantenimiento del escáner.
              </p>
              <button
                onClick={downloadManual}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#2F4156] text-white hover:bg-[#567C8D] transition border-0"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar manual
              </button>
            </div>
          </div>

          {/* Ficha técnica */}
          <div className="p-5 bg-[#F5EFEB]/40 rounded-xl border border-[#C8D9E6]/40 flex items-start gap-4">
            <span className="p-3 bg-[#567C8D] text-white rounded-xl flex-shrink-0">
              <FileText className="w-6 h-6" />
            </span>
            <div className="flex-1">
              <h4 className="font-bold text-[#2F4156] text-sm">Ficha técnica</h4>
              <p className="text-xs text-[#2F4156]/60 mt-0.5 leading-relaxed">
                Especificaciones completas: veracidad, FOV, peso, conectividad y formatos.
              </p>
              <button
                onClick={downloadDatasheet}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#567C8D] text-white hover:bg-[#2F4156] transition border-0"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar ficha técnica
              </button>
            </div>
          </div>
        </div>

        {/* Full specs table */}
        <div className="pt-2">
          <h4 className="text-xs font-black uppercase text-[#2F4156]/50 tracking-widest mb-2">Especificaciones</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
            {SPECS.map((s) => (
              <div key={s.label} className="flex justify-between items-center py-2 border-b border-[#C8D9E6]/25 text-xs">
                <span className="text-[#2F4156]/60 font-semibold">{s.label}</span>
                <span className="text-[#2F4156] font-bold font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support & warranty footnotes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-2.5 text-xs text-[#2F4156]/70 bg-[#F5EFEB]/30 border border-[#C8D9E6]/30 rounded-xl px-4 py-3">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
            <span>Garantía oficial Nova Dental Perú con certificado de biocompatibilidad.</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[#2F4156]/70 bg-[#F5EFEB]/30 border border-[#C8D9E6]/30 rounded-xl px-4 py-3">
            <LifeBuoy className="w-4.5 h-4.5 text-[#567C8D] flex-shrink-0" />
            <span>Soporte técnico: 01 234-5678 · soporte@novadental.pe</span>
          </div>
        </div>
      </div>
    </div>
  );
};
