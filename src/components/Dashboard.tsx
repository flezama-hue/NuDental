/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Case } from '../types';
import {
  Send,
  Clock,
  RefreshCw,
  Factory,
  PackageCheck,
  ChevronRight,
  Sparkles,
  Video,
  ScanLine,
  Timer,
  BatteryFull,
  Gauge,
  Activity,
  Wallet,
  CheckCircle2,
  CircleDollarSign,
  Loader2
} from 'lucide-react';

interface DashboardProps {
  cases: Case[];
  onNavigate: (screen: string, caseId?: string) => void;
  doctorName: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ cases, onNavigate, doctorName }) => {
  // Compute KPIs
  const totalThisMonth = cases.filter(c => c.status !== 'Borrador').length;
  
  // Custom average delivery (premium benchmark, below the <5 day goal)
  const avgDelivery = 4.2; // benchmark < 5 days

  // Remake rate benchmark (historical clinic average)
  const remakeRate = 5;
  const isRemakeWarning = remakeRate > 5;

  // Active production count
  const inProduction = cases.filter(c => ['Recibido', 'Aceptado', 'Aprobación de diseño', 'En producción'].includes(c.status)).length;

  // Pending confirmation (En camino)
  const pendingConfirmation = cases.filter(c => c.status === 'En camino').length;

  // Recent cases (top 3)
  const recentCases = [...cases]
    .filter(c => c.status !== 'Borrador')
    .slice(0, 4);

  // Case-type distribution by product category (derived from real cases)
  const categorize = (c: Case): string => {
    if (c.isBridge) return 'Puentes';
    const p = c.product.toLowerCase();
    if (p.includes('carilla')) return 'Carillas';
    if (p.includes('implante')) return 'Implantes';
    if (p.includes('prótesis') || p.includes('protesis')) return 'Prótesis';
    if (p.includes('corona')) return 'Coronas';
    return 'Otros';
  };

  const distributableCases = cases.filter(c => c.status !== 'Borrador');
  const categoryOrder = ['Coronas', 'Carillas', 'Puentes', 'Prótesis', 'Implantes', 'Otros'];
  const categoryColors: Record<string, string> = {
    Coronas: '#2F4156',
    Carillas: '#567C8D',
    Puentes: '#7B9CAD',
    'Prótesis': '#A7C0CE',
    Implantes: '#C8D9E6',
    Otros: '#D9C4B5',
  };
  const caseDistribution = categoryOrder
    .map(cat => ({
      label: cat,
      count: distributableCases.filter(c => categorize(c) === cat).length,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);
  const distributionTotal = distributableCases.length || 1;

  // Billing summary (PEN) derived from sent cases.
  // Delivered cases are treated as paid; everything else is pending collection.
  const fmtPen = (n: number) =>
    `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const billedTotal = distributableCases.reduce((sum, c) => sum + (c.price || 0), 0);
  const paidTotal = distributableCases
    .filter(c => c.paymentStatus === 'pagado')
    .reduce((sum, c) => sum + (c.price || 0), 0);
  const validatingTotal = distributableCases
    .filter(c => c.paymentStatus === 'en_validacion')
    .reduce((sum, c) => sum + (c.price || 0), 0);
  const pendingTotal = billedTotal - paidTotal;
  const paidCount = distributableCases.filter(c => c.paymentStatus === 'pagado').length;
  const validatingCount = distributableCases.filter(c => c.paymentStatus === 'en_validacion').length;
  const pendingCount = distributableCases.length - paidCount;
  const paidPct = billedTotal > 0 ? Math.round((paidTotal / billedTotal) * 100) : 0;

  // Scanner usage telemetry (Nova Dental IOS #ND-0042)
  // Scans are tied to the number of cases sent this month so figures stay consistent.
  const avgMinutesPerScan = 5.6;
  const scannerStats = {
    scansThisMonth: totalThisMonth,
    activeMinutes: Math.round(totalThisMonth * avgMinutesPerScan),
    avgMinutesPerScan,
    battery: 87,
    lastSync: 'Hace 12 min',
  };

  const getStatusBadge = (status: string, isUrgent: boolean) => {
    const commonClasses = "px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1 ";
    let statusClass = "";

    switch (status) {
      case 'Borrador':
        statusClass = "bg-[#2F4156]/10 text-[#2F4156]/70 border border-[#2F4156]/20";
        break;
      case 'Enviado':
        statusClass = "bg-[#C8D9E6] text-[#2F4156] border border-[#2F4156]/20";
        break;
      case 'Recibido':
        statusClass = "bg-[#567C8D]/20 text-[#2F4156] border border-[#567C8D]/30";
        break;
      case 'Aceptado':
        statusClass = "bg-[#567C8D] text-white";
        break;
      case 'Aprobación de diseño':
        statusClass = "bg-indigo-50 text-indigo-700 border border-indigo-200";
        break;
      case 'En producción':
        statusClass = "bg-blue-600/10 text-blue-700 border border-blue-600/20";
        break;
      case 'En camino':
        statusClass = "bg-amber-100 text-amber-800 border border-amber-200";
        break;
      case 'Entregado':
        statusClass = "bg-[#F5EFEB] text-[#2F4156] border border-[#567C8D]/20"; // White-Beige green hybrid
        break;
      case 'Rechazado':
        statusClass = "bg-red-50 text-red-700 border border-red-200";
        break;
      case 'Re-trabajo':
        statusClass = "bg-orange-50 text-orange-700 border border-orange-200";
        break;
      case 'Cancelado':
        statusClass = "bg-gray-100 text-gray-500 border border-gray-300 line-through";
        break;
      default:
        statusClass = "bg-[#2F4156]/10 text-[#2F4156]";
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className={commonClasses + statusClass}>{status}</span>
        {isUrgent && (
          <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wider animate-pulse">
            URGENTE
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#2F4156]">
            Bienvenido de nuevo, {doctorName}
          </h1>
          <p className="text-sm text-[#2F4156]/70 mt-1">
            Revisa el estado de tus órdenes, escaneos intraorales y coordina con nuestros técnicos dentales en vivo.
          </p>
        </div>
        
        <button
          onClick={() => onNavigate('Nuevo caso')}
          className="flex items-center gap-2 bg-[#2F4156] text-white hover:bg-[#567C8D] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md transform hover:-translate-y-0.5 self-start md:self-auto"
        >
          <Send className="w-4 h-4" />
          Enviar Nuevo Caso Clínico
        </button>
      </div>

      {/* Nova Dental Scanner Promo Header banner */}
      <div className="bg-gradient-to-r from-[#2F4156] via-[#567C8D] to-[#2F4156] text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,217,230,0.15),transparent)] pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-sm border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            Flujo Escáner Exclusivo
          </div>
          <h2 className="text-xl font-bold tracking-tight">Optimiza tu consulta con Nova Dental IOS</h2>
          <p className="text-white/80 text-sm max-w-xl">
            Sube archivos STL / PLY directo y obtén una revisión con Inteligencia Artificial en 60 segundos antes de enviar el caso.
          </p>
        </div>
        <button
          onClick={() => onNavigate('Escáner Nova Dental IOS')}
          className="bg-white text-[#2F4156] hover:bg-[#F5EFEB] px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md z-10"
        >
          Ver Detalles del Escáner
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="kpi-grid">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#567C8D]">
            <span className="p-2.5 bg-[#C8D9E6]/30 rounded-xl">
              <Send className="w-5 h-5 text-[#2F4156]" />
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
              Este mes
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-bold text-[#2F4156]">{totalThisMonth}</span>
            <span className="text-xs text-[#2F4156]/60">Casos enviados</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#567C8D]">
            <span className="p-2.5 bg-[#C8D9E6]/30 rounded-xl">
              <Clock className="w-5 h-5 text-[#2F4156]" />
            </span>
            <span className="text-[10px] font-bold text-[#567C8D] bg-[#C8D9E6]/40 px-2 py-0.5 rounded">
              Meta &lt;5d
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-bold text-[#2F4156]">{avgDelivery} días</span>
            <span className="text-xs text-[#2F4156]/60">Tiempo entrega prom.</span>
          </div>
        </div>

        {/* KPI 3 (Highlight Amber if remake rate > 5%) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between transition-colors ${
          isRemakeWarning 
            ? 'bg-amber-50/50 border-amber-300' 
            : 'bg-white border-[#C8D9E6]/50'
        }`}>
          <div className="flex justify-between items-start">
            <span className={`p-2.5 rounded-xl ${isRemakeWarning ? 'bg-amber-100 text-amber-700' : 'bg-[#C8D9E6]/30 text-[#2F4156]'}`}>
              <RefreshCw className="w-5 h-5" />
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              isRemakeWarning ? 'text-amber-800 bg-amber-100' : 'text-emerald-700 bg-emerald-50'
            }`}>
              {isRemakeWarning ? 'Alerta >5%' : 'Excelente'}
            </span>
          </div>
          <div className="mt-4">
            <span className={`block text-2xl font-bold ${isRemakeWarning ? 'text-amber-700' : 'text-[#2F4156]'}`}>
              {remakeRate}%
            </span>
            <span className="text-xs text-[#2F4156]/60">Tasa de Re-trabajo (Remake)</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#567C8D]">
            <span className="p-2.5 bg-[#C8D9E6]/30 rounded-xl">
              <Factory className="w-5 h-5 text-[#2F4156]" />
            </span>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Activos
            </span>
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-bold text-[#2F4156]">{inProduction}</span>
            <span className="text-xs text-[#2F4156]/60">Casos en producción</span>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="bg-white p-5 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#567C8D]">
            <span className="p-2.5 bg-[#C8D9E6]/30 rounded-xl">
              <PackageCheck className="w-5 h-5 text-[#2F4156]" />
            </span>
            {pendingConfirmation > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded animate-pulse">
                Acción req.
              </span>
            )}
          </div>
          <div className="mt-4">
            <span className="block text-2xl font-bold text-[#2F4156]">{pendingConfirmation}</span>
            <span className="text-xs text-[#2F4156]/60">Por confirmar recepción</span>
          </div>
        </div>
      </div>

      {/* Main Content Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Recent Cases */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col">
          <div className="flex justify-between items-center border-b border-[#C8D9E6]/30 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-[#2F4156] text-base">Órdenes Médicas Recientes</h3>
              <p className="text-xs text-[#2F4156]/60 mt-0.5">Listado de los últimos casos clínicos sincronizados</p>
            </div>
            <button
              onClick={() => onNavigate('Casos')}
              className="text-xs font-semibold text-[#567C8D] hover:text-[#2F4156] transition-colors inline-flex items-center gap-1 bg-transparent"
            >
              Ver todos los casos
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#C8D9E6]/40 text-xs text-[#2F4156]/70 uppercase tracking-wider font-semibold bg-[#F5EFEB]/40">
                  <th className="py-3 px-4">Caso / Paciente</th>
                  <th className="py-3 px-4">Indicación / FDI</th>
                  <th className="py-3 px-4">Entrega</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8D9E6]/30 text-sm">
                {recentCases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#C8D9E6]/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#567C8D] block">{c.id}</span>
                        <span className="font-bold text-[#2F4156]">{c.patientName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#2F4156]/80">
                      <div className="font-semibold">{c.product}</div>
                      <div className="text-[11px] font-mono mt-0.5">Piezas: {c.teeth.join(', ')}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#2F4156]/70 font-mono">
                      {c.deliveryDate}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(c.status, c.urgency === 'express')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigate('Casos', c.id)}
                        className="p-1 px-3 text-xs font-semibold text-white bg-[#2F4156] hover:bg-[#567C8D] rounded-lg transition-colors border-0"
                      >
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))}
                {recentCases.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#2F4156]/50">
                      No hay casos recientes. Crea uno nuevo para comenzar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1/3: Billing + Technical Center Status */}
        <div className="space-y-4">
          {/* Billing Summary */}
          <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-[#2F4156] text-base flex items-center gap-2">
                  <Wallet className="w-4.5 h-4.5 text-[#567C8D]" />
                  Facturación del Mes
                </h3>
                <p className="text-xs text-[#2F4156]/60 mt-0.5">Según casos enviados ({distributableCases.length})</p>
              </div>
            </div>

            {/* Total billed */}
            <div className="p-4 bg-[#2F4156] rounded-xl text-white">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#C8D9E6]">Facturación total</span>
              <span className="block text-2xl font-extrabold mt-1">{fmtPen(billedTotal)}</span>
            </div>

            {/* Paid vs pending progress */}
            <div>
              <div className="flex justify-between text-[11px] font-bold text-[#2F4156]/70 mb-1.5">
                <span>Pagado {paidPct}%</span>
                <span>Por pagar {100 - paidPct}%</span>
              </div>
              <div className="w-full bg-amber-200/60 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${paidPct}%` }} />
              </div>
            </div>

            {/* Paid / Pending breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pagado</span>
                </div>
                <span className="block text-sm font-extrabold text-emerald-800 mt-1">{fmtPen(paidTotal)}</span>
                <span className="text-[10px] text-emerald-700/70 font-semibold">{paidCount} casos pagados</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-1.5 text-amber-700">
                  <CircleDollarSign className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pendiente</span>
                </div>
                <span className="block text-sm font-extrabold text-amber-800 mt-1">{fmtPen(pendingTotal)}</span>
                <span className="text-[10px] text-amber-700/70 font-semibold">{pendingCount} por pagar</span>
              </div>
            </div>

            {validatingCount > 0 && (
              <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Validando depósito de {validatingCount} {validatingCount === 1 ? 'caso' : 'casos'} — {fmtPen(validatingTotal)}
              </div>
            )}
          </div>

          {/* Quick Technical Video Consult Center */}
          <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col space-y-4 justify-between">
            <div>
              <h3 className="font-bold text-[#2F4156] text-base">Técnico Dental Senior en Línea</h3>
              <p className="text-xs text-[#2F4156]/70 mt-1">
                ¿Problemas con los límites de escaneo o preparación biológica? Conversa cara a cara ahora mismo.
              </p>
            </div>

            <div className="p-4 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/40 flex gap-3.5 items-center">
              <div className="relative">
                <span className="block w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-[#2F4156] to-[#567C8D]" />
                <span className="absolute bottom-0 right-0 block w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[#2F4156]">Téc. Renzo Castro</h4>
                <p className="text-[11px] text-[#2F4156]/70">Especialista en Diseño CAD/CAM Fijo</p>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded font-bold mt-1">
                  Disponible para Perú
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => onNavigate('Soporte / Técnico en vivo')}
                className="w-full bg-[#567C8D] text-white hover:bg-[#2F4156] py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 border-0"
              >
                <Video className="w-4 h-4" />
                Iniciar Videoconsulta Dental
              </button>
              <p className="text-[10px] text-center text-[#2F4156]/50">
                Lunes a Sábado de 8:00 AM a 6:00 PM — Respuesta en &lt;2 min
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Row: Scanner usage + Case-type distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="analytics-grid">
        {/* Scanner Usage Metrics */}
        <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm">
          <div className="flex justify-between items-start border-b border-[#C8D9E6]/30 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-[#2F4156] text-base">Uso del Escáner Nova Dental IOS</h3>
              <p className="text-xs text-[#2F4156]/60 mt-0.5">Telemetría del cabezal #ND-0042 · Conexión cableada (USB-C)</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
              <Activity className="w-3.5 h-3.5" />
              En línea
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/30">
              <div className="flex items-center gap-2 text-[#567C8D]">
                <ScanLine className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Escaneos este mes</span>
              </div>
              <span className="block text-2xl font-bold text-[#2F4156] mt-1.5">{scannerStats.scansThisMonth}</span>
            </div>

            <div className="p-4 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/30">
              <div className="flex items-center gap-2 text-[#567C8D]">
                <Timer className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Minutos activos</span>
              </div>
              <span className="block text-2xl font-bold text-[#2F4156] mt-1.5">{scannerStats.activeMinutes} min</span>
            </div>

            <div className="p-4 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/30">
              <div className="flex items-center gap-2 text-[#567C8D]">
                <Gauge className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Tiempo / escaneo</span>
              </div>
              <span className="block text-2xl font-bold text-[#2F4156] mt-1.5">{scannerStats.avgMinutesPerScan} min</span>
            </div>

            <div className="p-4 bg-[#F5EFEB] rounded-xl border border-[#C8D9E6]/30">
              <div className="flex items-center gap-2 text-[#567C8D]">
                <BatteryFull className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Batería cabezal</span>
              </div>
              <span className="block text-2xl font-bold text-[#2F4156] mt-1.5">{scannerStats.battery}%</span>
              <div className="w-full bg-[#C8D9E6]/40 h-1.5 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${scannerStats.battery}%` }} />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#2F4156]/50 mt-4 text-right">Última sincronización: {scannerStats.lastSync}</p>
        </div>

        {/* Case-Type Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-[#C8D9E6]/50 shadow-sm flex flex-col">
          <div className="border-b border-[#C8D9E6]/30 pb-4 mb-4">
            <h3 className="font-bold text-[#2F4156] text-base">Distribución de Casos por Tipo</h3>
            <p className="text-xs text-[#2F4156]/60 mt-0.5">Qué trabajos envías con más frecuencia ({distributionTotal} casos)</p>
          </div>

          <div className="space-y-3.5 flex-1">
            {caseDistribution.map((item) => {
              const pct = Math.round((item.count / distributionTotal) * 100);
              return (
                <div key={item.label}>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-[#2F4156] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColors[item.label] }} />
                      {item.label}
                    </span>
                    <span className="font-bold text-[#2F4156]/70">{item.count} · {pct}%</span>
                  </div>
                  <div className="w-full bg-[#C8D9E6]/30 h-2.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: categoryColors[item.label] }} />
                  </div>
                </div>
              );
            })}
            {caseDistribution.length === 0 && (
              <p className="text-xs text-[#2F4156]/50 text-center py-8">Aún no hay casos enviados para analizar.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
