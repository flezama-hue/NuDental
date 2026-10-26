/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers } from 'lucide-react';

interface OdontogramProps {
  selectedTeeth: number[];
  onChange: (teeth: number[]) => void;
  isBridge: boolean;
  onBridgeToggle: (bridge: boolean) => void;
  readOnly?: boolean;
}

export const Odontogram: React.FC<OdontogramProps> = ({
  selectedTeeth,
  onChange,
  isBridge,
  onBridgeToggle,
  readOnly = false,
}) => {
  // Tooth FDI arrays arranged anatomically (viewed from dentist perspective facing patient)
  const quadrant1 = [18, 17, 16, 15, 14, 13, 12, 11]; // Maxilar Superior Derecho
  const quadrant2 = [21, 22, 23, 24, 25, 26, 27, 28]; // Maxilar Superior Izquierdo
  const quadrant4 = [48, 47, 46, 45, 44, 43, 42, 41]; // Mandibular Inferior Derecho
  const quadrant3 = [31, 32, 33, 34, 35, 36, 37, 38]; // Mandibular Inferior Izquierdo

  const handleToothClick = (tooth: number) => {
    if (readOnly) return;
    if (selectedTeeth.includes(tooth)) {
      onChange(selectedTeeth.filter((t) => t !== tooth));
    } else {
      onChange([...selectedTeeth, tooth].sort((a, b) => a - b));
    }
  };

  // Check if selected teeth are contiguous to suggest a bridge
  // In FDI, we checks contiguous if sorted array items have absolute difference of 1 (within same quadrant)
  const checkContiguous = (teeth: number[]): boolean => {
    if (teeth.length < 2) return false;
    const sorted = [...teeth].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = Math.abs(sorted[i + 1] - sorted[i]);
      // If same quadrant or crossing centerline (11 and 21)
      if (diff === 1 || (sorted[i] === 11 && sorted[i + 1] === 21) || (sorted[i] === 41 && sorted[i + 1] === 31)) {
        continue;
      }
      return false;
    }
    return true;
  };

  const showBridgeOption = checkContiguous(selectedTeeth);

  const renderToothElement = (tooth: number, quadrantType: 'sup' | 'inf') => {
    const isSelected = selectedTeeth.includes(tooth);
    // Draw simple molar/premolar/incisor shapes
    const isMolar = [18, 17, 16, 26, 27, 28, 48, 47, 46, 36, 37, 38].includes(tooth);
    const isPremolar = [15, 14, 24, 25, 45, 44, 34, 35].includes(tooth);

    let shapeClasses = "w-10 h-11 border-2 flex flex-col justify-between items-center p-1 rounded transition-all duration-200 cursor-pointer text-xs font-semibold ";
    if (isSelected) {
      shapeClasses += "bg-[#567C8D] border-[#2F4156] text-white shadow-md transform scale-105";
    } else {
      shapeClasses += "bg-white border-[#C8D9E6] text-[#2F4156] hover:bg-[#C8D9E6]/30 hover:border-[#567C8D]";
    }

    if (readOnly) {
      shapeClasses += " cursor-default pointer-events-none";
    }

    return (
      <div
        key={tooth}
        id={`tooth-${tooth}`}
        onClick={() => handleToothClick(tooth)}
        className={shapeClasses}
        title={`Pieza ${tooth}`}
      >
        <span className="text-[10px] uppercase font-mono text-center">
          {isMolar ? 'Mol' : isPremolar ? 'Prm' : 'Inc'}
        </span>
        <div className={`w-3.5 h-3.5 rounded-sm border ${isSelected ? 'border-white bg-[#2F4156]/20' : 'border-[#567C8D]/40 bg-[#F5EFEB]'} flex items-center justify-center`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#567C8D] opacity-0'} transition-opacity`} />
        </div>
        <span className="text-[11px] font-mono leading-none">{tooth}</span>
      </div>
    );
  };

  return (
    <div className="w-full bg-white p-5 rounded-xl border border-[#C8D9E6]/50 shadow-sm" id="odontogram-container">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C8D9E6]/40 pb-3 mb-4">
        <div>
          <h3 className="font-semibold text-[#2F4156] text-base">Odontograma Interactivo FDI</h3>
          <p className="text-xs text-[#2F4156]/70 mt-0.5">
            {readOnly ? 'Piezas tratadas en este caso clínico' : 'Seleccione una o más piezas dentales para el tratamiento.'}
          </p>
        </div>
        {!readOnly && selectedTeeth.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-[#567C8D] hover:text-[#2F4156] transition-colors underline bg-transparent"
          >
            Limpiar selección
          </button>
        )}
      </div>

      {/* Visual Chart Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[700px] flex flex-col gap-6 p-1">
          {/* MAXILAR SUPERIOR */}
          <div>
            <div className="text-[11px] font-semibold text-[#2F4156]/60 uppercase tracking-wider mb-2 text-center border-b border-[#C8D9E6]/20 pb-1">
              Maxilar Superior (Arcada Superior)
            </div>
            <div className="flex justify-between gap-10">
              {/* Cuadrante 1 (Derecho) */}
              <div className="flex flex-1 justify-end gap-1.5">
                {quadrant1.map((tooth) => renderToothElement(tooth, 'sup'))}
                <div className="w-px bg-[#C8D9E6] mx-1 self-stretch" />
              </div>

              {/* Cuadrante 2 (Izquierdo) */}
              <div className="flex flex-1 justify-start gap-1.5">
                <div className="w-px bg-[#C8D9E6] mx-1 self-stretch" />
                {quadrant2.map((tooth) => renderToothElement(tooth, 'sup'))}
              </div>
            </div>
          </div>

          {/* Línea divisoria oclusal */}
          <div className="relative h-2 flex items-center justify-center">
            <div className="w-full h-px border-t border-dashed border-[#567C8D]/30" />
            <div className="absolute text-[9px] font-mono font-bold bg-[#F5EFEB] px-2 py-0.5 rounded border border-[#C8D9E6] text-[#2F4156]/50">
              PLAN DE OCLUSIÓN
            </div>
          </div>

          {/* MANDIBULAR INFERIOR */}
          <div>
            <div className="flex justify-between gap-10">
              {/* Cuadrante 4 (Derecho) */}
              <div className="flex flex-1 justify-end gap-1.5">
                {quadrant4.map((tooth) => renderToothElement(tooth, 'inf'))}
                <div className="w-px bg-[#C8D9E6] mx-1 self-stretch" />
              </div>

              {/* Cuadrante 3 (Izquierdo) */}
              <div className="flex flex-1 justify-start gap-1.5">
                <div className="w-px bg-[#C8D9E6] mx-1 self-stretch" />
                {quadrant3.map((tooth) => renderToothElement(tooth, 'inf'))}
              </div>
            </div>
            <div className="text-[11px] font-semibold text-[#2F4156]/60 uppercase tracking-wider mt-2 text-center border-t border-[#C8D9E6]/20 pt-1">
              Mandíbula Inferior (Arcada Inferior)
            </div>
          </div>
        </div>
      </div>

      {/* Puente UI options */}
      {!readOnly && showBridgeOption && (
        <div className="mt-4 p-3 bg-[#C8D9E6]/20 border border-[#C8D9E6]/80 rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <Layers className="text-[#567C8D] w-5 h-5 animate-pulse" />
            <div>
              <span className="text-xs font-semibold text-[#2F4156]">
                ¿Hacer un Puente Dental?
              </span>
              <p className="text-[11px] text-[#2F4156]/80">
                Se detectaron piezas seleccionadas contiguas (FDI: {selectedTeeth.join(', ')}).
              </p>
            </div>
          </div>
          <button
            type="button"
            id="bridge-toggle-btn"
            onClick={() => onBridgeToggle(!isBridge)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isBridge
                ? 'bg-[#2F4156] text-white shadow-sm hover:bg-[#2F4156]/90'
                : 'bg-white text-[#2F4156] border border-[#C8D9E6] hover:bg-[#C8D9E6]/40'
            }`}
          >
            {isBridge ? '✓ Conectado como Puente' : 'Estructurar Puente'}
          </button>
        </div>
      )}

      {/* Active bridge badge in readOnly mode */}
      {readOnly && isBridge && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[#567C8D]/10 border border-[#567C8D]/20 text-[#567C8D] rounded-full text-xs font-semibold">
          <Layers className="w-3.5 h-3.5" />
          Estructura de Puente Clínico
        </div>
      )}

      {/* Anatomical Quadrants Key */}
      <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1.5 text-[10px] text-[#2F4156]/60 font-medium">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-white border border-[#C8D9E6]" />
          <span>Q1: Maxilar Sup. Derecho (18-11)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-white border border-[#C8D9E6]" />
          <span>Q2: Maxilar Sup. Izquierdo (21-28)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-white border border-[#C8D9E6]" />
          <span>Q3: Mandibular Inf. Izquierdo (31-38)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-white border border-[#C8D9E6]" />
          <span>Q4: Mandibular Inf. Derecho (48-41)</span>
        </div>
      </div>
    </div>
  );
};
