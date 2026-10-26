/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Case } from '../types';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, PlusCircle } from 'lucide-react';

interface CalendarProps {
  cases: Case[];
  onNavigate: (screen: string, caseId?: string) => void;
  onSetWizardDeliveryDate: (dateString: string) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  cases,
  onNavigate,
  onSetWizardDeliveryDate,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Navigable month/year state (defaults to June 2026, where seeded cases live)
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(5); // 0-indexed → June

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const monthName = `${monthNames[viewMonth]} ${viewYear}`;

  const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  // Days in the displayed month and Monday-based offset for the first day
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOffset = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mon=0 … Sun=6
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formatDay = (dayNum: number) =>
    `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;

  // Filter cases delivered on a given day of the displayed month/year
  const getCasesForDay = (dayNum: number): Case[] => {
    const formattedDay = formatDay(dayNum);
    return cases.filter((c) => c.deliveryDate === formattedDay && c.status !== 'Borrador');
  };

  // Total cases scheduled for delivery in the currently displayed month
  const monthCaseCount = daysArray.reduce((sum, d) => sum + getCasesForDay(d).length, 0);

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'Re-trabajo': return 'bg-orange-500 text-white';
      case 'Rechazado': return 'bg-red-500 text-white';
      case 'Cancelado': return 'bg-gray-400 text-white line-through';
      case 'En camino': return 'bg-amber-400 text-slate-900';
      case 'Entregado': return 'bg-emerald-600 text-white';
      case 'Aprobación de diseño': return 'bg-indigo-500 text-white';
      case 'En producción': return 'bg-blue-500 text-white';
      default: return 'bg-[#567C8D] text-white';
    }
  };

  const handleDaySelect = (dayNum: number) => {
    onSetWizardDeliveryDate(formatDay(dayNum));
    onNavigate('Nuevo caso');
  };

  return (
    <div className="space-y-6" id="calendar-module">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2F4156] flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[#567C8D]" />
            Calendario de Entregas Clínicas
          </h1>
          <p className="text-sm text-[#2F4156]/70 mt-1">
            Monitoree las fechas estimadas de recepción de sus prótesis y coronas. Clickeé un día para programar un nuevo caso.
          </p>
        </div>

        {/* View Selection with colors */}
        <div className="bg-white border border-[#C8D9E6] p-1 rounded-xl flex items-center shadow-sm">
          <button
            onClick={() => setViewMode('month')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'month'
                ? 'bg-[#2F4156] text-white'
                : 'text-[#2F4156] hover:bg-[#C8D9E6]/30'
            }`}
          >
            Mes Completo
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'week'
                ? 'bg-[#2F4156] text-white'
                : 'text-[#2F4156] hover:bg-[#C8D9E6]/30'
            }`}
          >
            Vista Semanal
          </button>
        </div>
      </div>

      {/* Main Board Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-md">
        {/* Navigation Indicator row */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#2F4156]">{monthName}</h2>
            <span className="text-[11px] font-mono font-bold bg-[#F5EFEB] border border-[#C8D9E6] px-2 py-0.5 rounded text-[#2F4156]/70">
              {monthCaseCount} {monthCaseCount === 1 ? 'entrega' : 'entregas'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={goToPrevMonth}
              title="Mes anterior"
              className="p-2 border border-[#C8D9E6] rounded-xl hover:bg-[#F5EFEB] transition-colors bg-transparent text-[#2F4156]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setViewYear(2026); setViewMonth(5); }}
              title="Volver a hoy (Junio 2026)"
              className="px-3 py-2 border border-[#C8D9E6] rounded-xl hover:bg-[#F5EFEB] transition-colors bg-transparent text-[#2F4156] text-xs font-bold"
            >
              Hoy
            </button>
            <button
              onClick={goToNextMonth}
              title="Mes siguiente"
              className="p-2 border border-[#C8D9E6] rounded-xl hover:bg-[#F5EFEB] transition-colors bg-transparent text-[#2F4156]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === 'month' ? (
          /* Monthly Grid (June 1st, 2026 starts on Monday) */
          <div className="space-y-1">
            {/* Weekdays Row header */}
            <div className="grid grid-cols-7 text-center font-bold text-xs text-[#2F4156]/70 uppercase tracking-widest pb-3 border-b border-[#C8D9E6]/30">
              {weekdays.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {/* Leading blank cells so day 1 aligns to its weekday */}
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`blank-${i}`} className="min-h-[110px] rounded-xl" />
              ))}
              {daysArray.map((day) => {
                const dayCases = getCasesForDay(day);
                return (
                  <div
                    key={day}
                    id={`calendar-day-${day}`}
                    className="min-h-[110px] bg-[#F5EFEB]/30 border border-[#C8D9E6]/30 hover:border-[#567C8D]/60 rounded-xl p-2 flex flex-col justify-between transition-all group relative"
                  >
                    {/* Header with day number & plus-button */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#2F4156]/70">
                        {day}
                      </span>
                      <button
                        onClick={() => handleDaySelect(day)}
                        className="opacity-0 group-hover:opacity-100 text-[#567C8D] hover:text-[#2F4156] transition-opacity p-0.5 bg-transparent border-0"
                        title="Programar entrega de caso para este día"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cases List */}
                    <div className="space-y-1 my-1.5 flex-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                      {dayCases.map((c) => {
                        const isUrgent = c.urgency === 'express';
                        return (
                          <div
                            key={c.id}
                            id={`calendar-event-${c.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onNavigate('Casos', c.id);
                            }}
                            className={`p-1 px-1.5 rounded text-[10px] leading-tight font-semibold flex flex-col cursor-pointer truncate transition-all transform hover:scale-102 ${getStatusBg(
                              c.status
                            )} ${isUrgent ? 'border-2 border-orange-600 shadow-sm' : ''}`}
                            title={`${c.patientName} - ${c.product}`}
                          >
                            <span className="block truncate font-bold uppercase">{c.patientName.split(' ')[0]}</span>
                            <span className="text-[8px] opacity-90 truncate">{c.product}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Weekly Grid (Week of June 1–7, 2026) */
          <div className="grid grid-cols-7 gap-3">
            {weekdays.map((day, idx) => {
              const dayNum = idx + 1;
              const dayCases = getCasesForDay(dayNum);
              return (
                <div key={day} className="flex flex-col space-y-3 p-1 rounded-xl">
                  {/* Row header */}
                  <div className="text-center py-2 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/50">
                    <span className="block text-xs font-bold text-[#2F4156]">{day}</span>
                    <span className="text-lg font-mono font-black text-[#567C8D]">{dayNum}</span>
                  </div>

                  {/* Daily cases column cards */}
                  <div className="space-y-2 flex-1 min-h-[300px] bg-[#C8D9E6]/10 p-2 rounded-xl border border-dashed border-[#C8D9E6]/60">
                    {dayCases.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => onNavigate('Casos', c.id)}
                        className={`p-3 rounded-lg flex flex-col space-y-1.5 cursor-pointer shadow-sm border border-black/5 transition-all text-left ${getStatusBg(
                          c.status
                        )} ${c.urgency === 'express' ? 'border-2 border-orange-600 shadow-md ring-1 ring-orange-400' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold opacity-75">{c.id}</span>
                          {c.urgency === 'express' && (
                            <span className="bg-orange-600 text-white text-[8px] font-black px-1.5 rounded animate-pulse">
                              EXP
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold leading-tight block">{c.patientName}</span>
                        <span className="text-[10px] leading-tight block opacity-95">{c.product}</span>
                        
                        <div className="flex items-center gap-1 text-[9px] pt-1 border-t border-white/20 mt-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Entrega {c.deliveryDate}</span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => handleDaySelect(dayNum)}
                      className="w-full text-center py-3 border border-dashed border-[#567C8D]/40 text-[#567C8D] hover:text-[#2F4156] rounded-lg text-xs font-semibold bg-transparent transition-all flex items-center justify-center gap-1.5 group"
                    >
                      <PlusCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      Añadir caso
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
