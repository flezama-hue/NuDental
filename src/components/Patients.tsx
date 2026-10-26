/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, Case } from '../types';
import { Search, UserPlus, FileText, Send, ArrowLeft, ArrowUpRight } from 'lucide-react';

interface PatientsProps {
  patients: Patient[];
  cases: Case[];
  onNavigate: (screen: string, caseId?: string) => void;
  onSelectPatientForNewCase: (patient: Patient) => void;
  onAddPatient: (patient: Patient) => void;
}

export const Patients: React.FC<PatientsProps> = ({
  patients,
  cases,
  onNavigate,
  onSelectPatientForNewCase,
  onAddPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);

  // Form State for new Patient
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientBirthDate, setNewPatientBirthDate] = useState('1990-01-01');
  const [newPatientGender, setNewPatientGender] = useState<'Masculino' | 'Femenino' | 'Otro'>('Masculino');
  const [newPatientInternalId, setNewPatientInternalId] = useState('');

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.internalId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const patientCases = selectedPatient
    ? cases.filter((c) => c.patientName.toLowerCase() === selectedPatient.name.toLowerCase())
    : [];

  const handleAddPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientInternalId.trim()) return;

    const newPatient: Patient = {
      id: 'P' + (patients.length + 1).toString().padStart(2, '0'),
      name: newPatientName,
      birthDate: newPatientBirthDate,
      gender: newPatientGender,
      internalId: newPatientInternalId.toUpperCase(),
    };

    onAddPatient(newPatient);
    setIsAddingPatient(false);
    setSelectedPatientId(newPatient.id); // View details of new patient

    // Reset Form
    setNewPatientName('');
    setNewPatientBirthDate('1990-01-01');
    setNewPatientGender('Masculino');
    setNewPatientInternalId('');
  };

  const calculateAge = (dobString: string) => {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Borrador': return 'bg-[#2F4156]/10 text-[#2F4156]/70';
      case 'Enviado': return 'bg-[#C8D9E6] text-[#2F4156] border border-[#2F4156]/20';
      case 'Recibido': return 'bg-[#567C8D]/20 text-[#2F4156]';
      case 'Aceptado': return 'bg-[#567C8D] text-white';
      case 'En producción': return 'bg-blue-600/10 text-blue-700';
      case 'En camino': return 'bg-amber-100 text-amber-800';
      case 'Entregado': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-[#2F4156]/10 text-[#2F4156]';
    }
  };

  return (
    <div className="space-y-6" id="patients-module">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2F4156]">Directorio Clínico de Pacientes</h1>
          <p className="text-sm text-[#2F4156]/70 mt-1">
            Gestione y revise históricos clínicos, escaneos e indicaciones por paciente.
          </p>
        </div>
        {!selectedPatient && !isAddingPatient && (
          <button
            onClick={() => setIsAddingPatient(true)}
            className="flex items-center gap-2 bg-[#2F4156] text-white hover:bg-[#567C8D] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" />
            Registrar Paciente Nuevo
          </button>
        )}
      </div>

      {isAddingPatient && (
        <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm max-w-xl mx-auto" id="add-patient-form">
          <div className="flex items-center gap-2 mb-4 border-b border-[#C8D9E6]/20 pb-2">
            <button
              onClick={() => setIsAddingPatient(false)}
              className="p-1 text-[#2F4156] hover:bg-[#C8D9E6]/30 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-[#2F4156]">Registrar Paciente</h2>
          </div>

          <form onSubmit={handleAddPatientSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2F4156]/80 uppercase tracking-wide mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Sofía Luján Torres"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                className="w-full p-2.5 border border-[#C8D9E6] rounded-xl focus:outline-none focus:border-[#567C8D] text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#2F4156]/80 uppercase tracking-wide mb-1">
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  required
                  value={newPatientBirthDate}
                  onChange={(e) => setNewPatientBirthDate(e.target.value)}
                  className="w-full p-2.5 border border-[#C8D9E6] rounded-xl focus:outline-none focus:border-[#567C8D] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2F4156]/80 uppercase tracking-wide mb-1">
                  Sexo Clínico *
                </label>
                <select
                  value={newPatientGender}
                  onChange={(e) => setNewPatientGender(e.target.value as any)}
                  className="w-full p-2.5 border border-[#C8D9E6] rounded-xl focus:outline-none focus:border-[#567C8D] text-sm bg-white text-[#2F4156]"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2F4156]/80 uppercase tracking-wide mb-1">
                ID Interno / Nº Historia Clínica *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. HC-20042"
                value={newPatientInternalId}
                onChange={(e) => setNewPatientInternalId(e.target.value)}
                className="w-full p-2.5 border border-[#C8D9E6] rounded-xl focus:outline-none focus:border-[#567C8D] text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingPatient(false)}
                className="px-4 py-2 text-sm font-semibold text-[#2F4156] bg-[#F5EFEB] hover:bg-[#C8D9E6]/30 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2F4156] hover:bg-[#567C8D] rounded-xl shadow transition"
              >
                Registrar Paciente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Primary flow: Master-Detail selection */}
      {!isAddingPatient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patients Index */}
          <div className={`bg-white rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col ${selectedPatient ? 'lg:col-span-1 border-r border-[#C8D9E6]/40' : 'lg:col-span-3'}`}>
            <div className="p-4 border-b border-[#C8D9E6]/30 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#2F4156]/50" />
                <input
                  type="text"
                  placeholder="Buscar paciente o Historia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#C8D9E6] rounded-xl bg-white text-sm focus:outline-none focus:border-[#567C8D] text-[#2F4156]"
                />
              </div>
            </div>

            <div className="divide-y divide-[#C8D9E6]/20 overflow-y-auto max-h-[580px]">
              {filteredPatients.map((p) => {
                const isSelected = selectedPatientId === p.id;
                return (
                  <div
                    key={p.id}
                    id={`patient-card-${p.id}`}
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#C8D9E6]/35 border-l-4 border-[#2F4156]' : 'hover:bg-[#C8D9E6]/10'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-[#2F4156]">{p.name}</h4>
                      <div className="flex gap-3 text-xs text-[#2F4156]/60 font-mono mt-1">
                        <span>H.C: {p.internalId}</span>
                        <span>•</span>
                        <span>{calculateAge(p.birthDate)} años ({p.gender === 'Femenino' ? 'F' : 'M'})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPatientForNewCase(p);
                        }}
                        className="p-1.5 hover:bg-[#567C8D]/20 text-[#567C8D] rounded-lg transition"
                        title="Crear Nueva Orden"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        className="p-1 px-2.5 text-xs font-semibold text-[#2F4156] hover:bg-[#C8D9E6] bg-[#F5EFEB] rounded-lg border-0 transition"
                      >
                        Ficha
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredPatients.length === 0 && (
                <div className="p-8 text-center text-[#2F4156]/50">
                  No se encontraron pacientes para "{searchTerm}".
                </div>
              )}
            </div>
          </div>

          {/* Individual Medical Record Drawer / Sheet details */}
          {selectedPatient && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#C8D9E6]/50 shadow-md p-6 flex flex-col space-y-6 animate-fade-in" id="patient-details-view">
              <div className="flex justify-between items-start border-b border-[#C8D9E6]/20 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1 px-2.5 bg-[#2F4156] text-white rounded text-[11px] font-bold font-mono">
                      {selectedPatient.internalId}
                    </span>
                    <span className="text-xs text-[#2F4156]/50 font-medium">Ficha de Paciente</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#2F4156]">{selectedPatient.name}</h2>
                </div>
                <button
                  onClick={() => onSelectPatientForNewCase(selectedPatient)}
                  className="bg-[#2F4156] text-white hover:bg-[#567C8D] px-4 py-2 rounded-xl text-xs font-bold shadow flex items-center gap-1.5 transition-all border-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  Iniciar Nuevo Caso
                </button>
              </div>

              {/* Physical Parameters Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/30">
                  <span className="block text-xs uppercase font-bold text-[#2F4156]/60">Nacimiento</span>
                  <span className="text-sm font-semibold text-[#2F4156] mt-0.5 block">{selectedPatient.birthDate}</span>
                </div>
                <div className="p-4 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/30">
                  <span className="block text-xs uppercase font-bold text-[#2F4156]/60">Sexo Clínico</span>
                  <span className="text-sm font-semibold text-[#2F4156] mt-0.5 block">{selectedPatient.gender}</span>
                </div>
                <div className="p-4 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/30">
                  <span className="block text-xs uppercase font-bold text-[#2F4156]/60">Edad</span>
                  <span className="text-sm font-semibold text-[#2F4156] mt-0.5 block">{calculateAge(selectedPatient.birthDate)} años</span>
                </div>
              </div>

              {/* Dynamic History Table */}
              <div className="space-y-3">
                <h3 className="font-bold text-[#2F4156] text-sm uppercase tracking-wide">
                  Histórico de Casos Enviados ({patientCases.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#C8D9E6]/30 text-xs text-[#2F4156]/70 uppercase font-semibold bg-[#F5EFEB]/50">
                        <th className="py-2.5 px-3">Nº Caso</th>
                        <th className="py-2.5 px-3">Producto / Material</th>
                        <th className="py-2.5 px-3">Pieza FDI</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-right">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#C8D9E6]/20">
                      {patientCases.map((c) => (
                        <tr key={c.id} className="hover:bg-[#C8D9E6]/10 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#567C8D] text-[11px]">
                            {c.id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-[#2F4156]">{c.product}</div>
                            <div className="text-[10px] text-[#2F4156]/60 mt-0.5 truncate max-w-[150px]">{c.material}</div>
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-[#2F4156]/80">
                            {c.teeth.join(', ')}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusBadgeColor(c.status)}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => onNavigate('Casos', c.id)}
                              className="p-1 px-2.5 hover:bg-[#2F4156] hover:text-white text-[#2F4156] bg-[#F5EFEB] rounded-lg transition-all font-semibold inline-flex items-center gap-1 text-[11px] border-0"
                            >
                              Ver
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {patientCases.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#2F4156]/50 italic">
                            No se registran órdenes para este paciente. Use el botón superior para enviar el primer caso.
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
      )}
    </div>
  );
};
