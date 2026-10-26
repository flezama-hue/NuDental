/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Case } from '../types';
import {
  Wallet,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  CreditCard,
  XCircle,
  Search,
} from 'lucide-react';

interface PaymentsProps {
  cases: Case[];
  onMarkAsPaid: (caseId: string) => void;
  onRejectPayment: (caseId: string) => void;
  onNavigate: (screen: string, caseId?: string) => void;
}

type PaymentFilter = 'todos' | 'pendiente' | 'en_validacion' | 'pagado';

export const Payments: React.FC<PaymentsProps> = ({
  cases,
  onMarkAsPaid,
  onRejectPayment,
  onNavigate,
}) => {
  const [filter, setFilter] = useState<PaymentFilter>('todos');
  const [query, setQuery] = useState('');

  const billable = cases.filter((c) => c.status !== 'Borrador');

  const fmtPen = (n: number) =>
    `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statusOf = (c: Case) => c.paymentStatus || 'pendiente';

  const billedTotal = billable.reduce((s, c) => s + (c.price || 0), 0);
  const paidTotal = billable.filter((c) => statusOf(c) === 'pagado').reduce((s, c) => s + (c.price || 0), 0);
  const validatingTotal = billable.filter((c) => statusOf(c) === 'en_validacion').reduce((s, c) => s + (c.price || 0), 0);
  const pendingTotal = billable.filter((c) => statusOf(c) === 'pendiente').reduce((s, c) => s + (c.price || 0), 0);
  const paidPct = billedTotal > 0 ? Math.round((paidTotal / billedTotal) * 100) : 0;

  const filtered = billable.filter((c) => {
    const matchesFilter = filter === 'todos' || statusOf(c) === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      c.patientName.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.product.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const filterTabs: { key: PaymentFilter; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'en_validacion', label: 'En validación' },
    { key: 'pagado', label: 'Pagados' },
  ];

  return (
    <div className="space-y-6" id="payments-module">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#2F4156] flex items-center gap-2">
          <Wallet className="w-6 h-6 text-[#567C8D]" />
          Pagos y Facturación
        </h1>
        <p className="text-sm text-[#2F4156]/70 mt-1">
          Gestione los cobros de sus casos. Al marcar un pago, el sistema valida el depósito antes de confirmarlo.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#2F4156] p-5 rounded-2xl text-white shadow-sm">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#C8D9E6]">Facturación total</span>
          <span className="block text-2xl font-extrabold mt-1">{fmtPen(billedTotal)}</span>
          <span className="text-[11px] text-[#C8D9E6]/80">{billable.length} casos</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Pagado ({paidPct}%)</span>
          </div>
          <span className="block text-2xl font-extrabold text-emerald-800 mt-1">{fmtPen(paidTotal)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-blue-700">
            <Loader2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">En validación</span>
          </div>
          <span className="block text-2xl font-extrabold text-blue-800 mt-1">{fmtPen(validatingTotal)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
          <div className="flex items-center gap-1.5 text-amber-700">
            <CircleDollarSign className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Pendiente</span>
          </div>
          <span className="block text-2xl font-extrabold text-amber-800 mt-1">{fmtPen(pendingTotal)}</span>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-md space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 bg-[#F5EFEB] p-1 rounded-xl">
            {filterTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === t.key ? 'bg-[#2F4156] text-white shadow-sm' : 'text-[#2F4156] hover:bg-[#C8D9E6]/30'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#567C8D]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar paciente, caso o producto…"
              className="pl-9 pr-3 py-2 border border-[#C8D9E6] rounded-xl text-xs text-[#2F4156] focus:outline-none focus:border-[#567C8D] w-full md:w-72"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#C8D9E6]/40 text-xs text-[#2F4156]/70 uppercase font-semibold bg-[#F5EFEB]/40">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Paciente</th>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4">Estado de pago</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C8D9E6]/25">
              {filtered.map((c) => {
                const ps = statusOf(c);
                return (
                  <tr key={c.id} className="hover:bg-[#C8D9E6]/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onNavigate('Casos', c.id)}
                        className="font-mono text-xs font-bold text-[#567C8D] hover:text-[#2F4156] hover:underline bg-transparent border-0"
                      >
                        {c.id}
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onNavigate('Casos', c.id)}
                        className="font-bold text-[#2F4156] hover:text-[#567C8D] hover:underline bg-transparent border-0 text-left"
                      >
                        {c.patientName}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-[#2F4156]/80">{c.product}</td>
                    <td className="py-3.5 px-4 text-xs font-mono font-bold text-[#2F4156]">
                      {c.price != null ? fmtPen(c.price) : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {ps === 'pagado' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Pagado
                        </span>
                      ) : ps === 'en_validacion' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Validando pago…
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <CircleDollarSign className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ps === 'pendiente' && (
                        <button
                          onClick={() => onMarkAsPaid(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2F4156] text-white hover:bg-[#567C8D] transition border-0"
                          title="Marcar como pagado e iniciar la validación del depósito"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Marcar pagado
                        </button>
                      )}
                      {ps === 'en_validacion' && (
                        <button
                          onClick={() => onRejectPayment(c.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                          title="Simular que el sistema no encontró el depósito"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Simular rechazo
                        </button>
                      )}
                      {ps === 'pagado' && (
                        <span className="text-[11px] text-emerald-700/70 font-semibold">Depósito confirmado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#2F4156]/50 text-sm">
                    No hay casos que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
