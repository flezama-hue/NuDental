/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Case, ChatMessage } from '../types';
import { Search, Send, Image, MessageSquare, BadgeAlert, ArrowUpRight, CheckCheck } from 'lucide-react';

interface MessagesProps {
  cases: Case[];
  activeCaseId?: string;
  onNavigate: (screen: string, caseId?: string) => void;
  onSendMessage: (caseId: string, text: string) => void;
}

export const Messages: React.FC<MessagesProps> = ({
  cases,
  activeCaseId,
  onNavigate,
  onSendMessage,
}) => {
  // Filter cases with conversation or we can use all sent cases as valid chat threads
  const chatThreads = cases.filter((c) => c.status !== 'Borrador');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(activeCaseId || chatThreads[0]?.id || '');
  const [textInput, setTextInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCaseId) {
      setSelectedCaseId(activeCaseId);
    }
  }, [activeCaseId]);

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  // Auto Scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCase?.chat]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !selectedCaseId) return;

    onSendMessage(selectedCaseId, textInput.trim());
    setTextInput('');

    // Trigger an automated laboratory technician reply after 1.5s
    setTimeout(() => {
      const responses = [
        "Entendido Dr. García. Procedemos según sus especificaciones.",
        "Perfecto, acabo de registrar la acotación en el orden CAD de fabricación.",
        "Gracias doctor, el técnico encargado de su modelo ya está revisando su mensaje.",
        "Recibido doctor. Los detalles del tono VITA y la textura están actualizados en el sistema.",
        "Entendido. Si de casualidad requiere fotos clínicas adicionales, nos avisa por esta vía.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      onSendMessage(selectedCaseId, `[AUTO-LAB] ${randomResponse}`);
    }, 1500);
  };

  const filteredThreads = chatThreads.filter(
    (t) =>
      t.patientName.toLowerCase().includes(chatSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(chatSearch.toLowerCase()) ||
      t.product.toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <div className="space-y-6" id="messages-module">
      <div>
        <h1 className="text-2xl font-bold text-[#2F4156]">Bandeja de Mensajes (Case Talk)</h1>
        <p className="text-sm text-[#2F4156]/70 mt-1">
          Canal exclusivo y directo con los técnicos CAD/CAM del laboratorio Nova Dental.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#C8D9E6]/50 shadow-md grid grid-cols-1 md:grid-cols-3 overflow-hidden min-h-[580px]">
        {/* Left Side: Threads List */}
        <div className="md:col-span-1 border-r border-[#C8D9E6]/40 flex flex-col bg-[#F5EFEB]/30">
          <div className="p-4 border-b border-[#C8D9E6]/30">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[#2F4156]/50" />
              <input
                type="text"
                placeholder="Buscar conversación..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-[#C8D9E6] rounded-xl text-xs focus:outline-none focus:border-[#567C8D] bg-white text-[#2F4156]"
              />
            </div>
          </div>

          <div className="divide-y divide-[#C8D9E6]/20 overflow-y-auto flex-1 max-h-[480px]">
            {filteredThreads.map((t) => {
              const isSelected = t.id === selectedCaseId;
              const lastMessage = t.chat[t.chat.length - 1];
              const isUrgent = t.urgency === 'express';

              return (
                <div
                  key={t.id}
                  id={`chat-thread-${t.id}`}
                  onClick={() => setSelectedCaseId(t.id)}
                  className={`p-4 cursor-pointer transition-colors flex flex-col space-y-1.5 ${
                    isSelected ? 'bg-[#C8D9E6]/40 border-l-4 border-[#2F4156]' : 'hover:bg-[#C8D9E6]/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#567C8D] block">{t.id}</span>
                      <h4 className="font-bold text-sm text-[#2F4156]">{t.patientName}</h4>
                    </div>
                    {isUrgent && (
                      <span className="bg-orange-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                        EXP
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#2F4156]/70 font-semibold truncate max-w-[150px]">{t.product}</span>
                    <span className="text-[10px] text-[#2F4156]/55 font-mono">{lastMessage ? lastMessage.time.split(' ')[1] : ''}</span>
                  </div>
                  <p className="text-xs text-[#2F4156]/60 truncate italic max-w-[220px]">
                    {lastMessage ? (lastMessage.sender === 'doctor' ? 'Tú: ' : 'Lab: ') : 'Sin mensajes aún'}
                    {lastMessage ? lastMessage.text.replace('[AUTO-LAB] ', '') : ''}
                  </p>
                </div>
              );
            })}
            {filteredThreads.length === 0 && (
              <div className="p-8 text-center text-[#2F4156]/50 text-xs">
                No hay conversaciones activas.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Area */}
        <div className="md:col-span-2 flex flex-col h-full bg-white">
          {activeCase ? (
            <>
              {/* Active Chat Header */}
              <div className="p-4 border-b border-[#C8D9E6]/30 flex justify-between items-center bg-[#F5EFEB]/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#C8D9E6]/30 rounded-xl">
                    <MessageSquare className="w-5 h-5 text-[#2F4156]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#2F4156] text-sm md:text-base">{activeCase.patientName}</h3>
                      <span className="font-mono text-xs font-bold text-[#567C8D]">{activeCase.id}</span>
                    </div>
                    <p className="text-xs text-[#2F4156]/70 mt-0.5 font-bold">
                      {activeCase.product} — FDI: {activeCase.teeth.join(', ')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('Casos', activeCase.id)}
                  className="p-1.5 px-3 bg-[#2F4156] hover:bg-[#567C8D] text-white text-xs font-bold rounded-lg transition shadow flex items-center gap-1 border-0"
                >
                  Ver Ficha del Caso
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Chat Bubble Scrollable Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[380px] min-h-[340px] bg-[#F5EFEB]/10">
                {activeCase.chat.map((msg) => {
                  const isDoctor = msg.sender === 'doctor';
                  const textContent = msg.text.startsWith('[AUTO-LAB] ')
                    ? msg.text.replace('[AUTO-LAB] ', '')
                    : msg.text;

                  const isAutoReply = msg.text.startsWith('[AUTO-LAB] ');

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isDoctor ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      {/* Message Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl text-xs md:text-sm shadow-sm ${
                          isDoctor
                            ? 'bg-[#C8D9E6] text-[#2F4156] rounded-tr-none'
                            : 'bg-white border border-[#C8D9E6]/60 text-[#2F4156] rounded-tl-none'
                        }`}
                      >
                        {isAutoReply && (
                          <span className="block text-[9px] uppercase tracking-wider text-[#567C8D] font-bold mb-1">
                            Soporte Nova Dental
                          </span>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap">{textContent}</p>
                      </div>

                      {/* Info lines (Time, checks) */}
                      <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-[#2F4156]/50 font-mono">
                        <span>{msg.time}</span>
                        {isDoctor && <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                    </div>
                  );
                })}
                {activeCase.chat.length === 0 && (
                  <div className="h-full flex flex-col justify-center items-center text-[#2F4156]/50">
                    <MessageSquare className="w-10 h-10 text-[#C8D9E6] mb-2" />
                    <p className="text-xs">No hay mensajes previos. Escríbele al laboratorista para coordinar.</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSend} className="p-4 border-t border-[#C8D9E6]/30 flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 border border-[#C8D9E6] hover:bg-[#F5EFEB] text-[#2F4156]/70 rounded-xl transition bg-transparent"
                  title="Adjuntar Imagen para referencia"
                >
                  <Image className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder="Escriba un mensaje para el técnico..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="flex-1 p-2.5 border border-[#C8D9E6] rounded-xl text-sm focus:outline-none focus:border-[#567C8D] text-[#2F4156]"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-[#2F4156] text-white hover:bg-[#567C8D] rounded-xl transition shadow flex items-center justify-center border-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-[#2F4156]/50">
              <MessageSquare className="w-14 h-14 text-[#C8D9E6] mb-3" />
              <h3 className="font-bold text-base text-[#2F4156]">Ningún chat seleccionado</h3>
              <p className="text-xs max-w-md mt-1">
                Selecciona una orden médica a la izquierda para iniciar la coordinación interactiva en tiempo real sobre tu diseño CAD.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
