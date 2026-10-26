import React from 'react';
import { shortDate, statusLabel } from '../api';

export const inputClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100';
export const buttonPrimary = 'inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50';
export const buttonSecondary = 'inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
export const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm';

export function Alert({ type = 'error', children }: { type?: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  const classes = type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50 text-sky-800';
  return <div className={`rounded-xl border px-4 py-3 text-sm ${classes}`}>{children}</div>;
}

export function Badge({ status, children }: { status?: string; children?: React.ReactNode }) {
  const value = status || '';
  const style = value === 'delivered' || value === 'approved' || value === 'confirmed'
    ? 'bg-emerald-100 text-emerald-800'
    : value === 'rejected' || value === 'cancelled' || value === 'failed'
      ? 'bg-red-100 text-red-800'
      : value === 'rework' || value === 'review' || value === 'incident' || value === 'changes_requested'
        ? 'bg-amber-100 text-amber-900'
        : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{children || statusLabel[value] || value || 'Sin estado'}</span>;
}

export function Empty({ title, detail }: { title: string; detail?: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><p className="font-semibold text-slate-800">{title}</p>{detail && <p className="mt-2 text-sm text-slate-500">{detail}</p>}</div>;
}

export function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return <div className={`${cardClass} p-5`}><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>{detail && <p className="mt-2 text-xs text-slate-500">{detail}</p>}</div>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}</label>;
}

export function CaseTimeline({ tracking }: { tracking: any }) {
  if (!tracking) return <p className="text-sm text-slate-500">El laboratorio todavía no publicó el avance.</p>;
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{tracking.label}</p><p className="mt-1 text-xs text-slate-500">Actualizado {shortDate(tracking.updatedAt)}</p></div>{tracking.progressPercent != null && <span className="text-lg font-bold text-teal-700">{tracking.progressPercent}%</span>}</div>
    {tracking.progressPercent != null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-teal-600" style={{ width: `${tracking.progressPercent}%` }} /></div>}
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600"><span>Origen: {tracking.progressKind === 'measured' ? 'medido' : tracking.progressKind === 'estimated' ? 'estimado' : 'sin porcentaje'}</span>{tracking.responsibleName && <span>· Responsable: {tracking.responsibleName}</span>}</div>
    {tracking.blocked && <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">Bloqueado: {tracking.blockReason || 'requiere información'}</p>}
  </div>;
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return <div className="flex items-center gap-3 py-8 text-sm text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700" />{label}</div>;
}
