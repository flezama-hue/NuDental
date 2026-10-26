import React, { useEffect, useMemo, useState } from 'react';
import { api, type CaseDetail, type CaseSummary, type CatalogProduct, type DashboardData, money, shortDate, statusLabel, type StoredPatient } from '../api';
import { Alert, Badge, buttonPrimary, buttonSecondary, cardClass, CaseTimeline, Empty, Field, inputClass, Spinner, Stat } from './ui';

type Tab = 'dashboard' | 'cases' | 'new' | 'patients';

export default function ClinicalPortal() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [patients, setPatients] = useState<StoredPatient[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [selected, setSelected] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [patientForm, setPatientForm] = useState({ name: '', internalId: '', birthDate: '', gender: 'Otro' });
  const [caseForm, setCaseForm] = useState({ patientId: '', productId: '', title: '', instructions: '', material: '', shade: '', tooth: '', quantity: 1, urgency: 'standard', dueDate: '', paymentMode: 'advance_balance', clientReference: '', shippingAddress: '', submissionSource: 'manual' });
  const [message, setMessage] = useState('');
  const [payment, setPayment] = useState({ amount: '', reference: '', evidenceNote: '' });

  const filteredCases = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return cases;
    return cases.filter(item => [item.code, item.title, item.patient?.name, item.patient?.internalId].some(part => String(part || '').toLowerCase().includes(value)));
  }, [cases, search]);

  async function loadBase() {
    setLoading(true); setError('');
    try {
      const [d, c, p, products] = await Promise.all([
        api<DashboardData>('/dashboard'),
        api<{ data: CaseSummary[] }>('/cases?limit=100'),
        api<{ data: StoredPatient[] }>('/patients?limit=100'),
        api<{ data: CatalogProduct[] }>('/catalog'),
      ]);
      setDashboard(d); setCases(c.data); setPatients(p.data); setCatalog(products.data);
      setCaseForm(current => ({ ...current, patientId: current.patientId || p.data[0]?.id || '', productId: current.productId || products.data[0]?.id || '' }));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el portal.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadBase(); }, []);

  async function openCase(id: string) {
    setBusy(true); setError(''); setNotice('');
    try { const response = await api<{ data: CaseDetail }>(`/cases/${id}`); setSelected(response.data); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el caso.'); }
    finally { setBusy(false); }
  }

  async function createPatient(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await api<{ data: StoredPatient }>('/patients', { method: 'POST', body: JSON.stringify(patientForm) });
      setPatients(current => [response.data, ...current]);
      setCaseForm(current => ({ ...current, patientId: response.data.id }));
      setPatientForm({ name: '', internalId: '', birthDate: '', gender: 'Otro' });
      setNotice('Paciente guardado. Ya puede seleccionarse al crear un caso.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el paciente.'); }
    finally { setBusy(false); }
  }

  async function createCase(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const payload = { ...caseForm, quantity: Number(caseForm.quantity), tooth: caseForm.tooth ? Number(caseForm.tooth) : null, dueDate: caseForm.dueDate || null };
      const response = await api<{ data: CaseSummary }>('/cases', { method: 'POST', body: JSON.stringify(payload) });
      setCases(current => [response.data, ...current]);
      setNotice(`Caso ${response.data.code} creado y enviado al laboratorio.`);
      setCaseForm(current => ({ ...current, title: '', instructions: '', material: '', shade: '', tooth: '', quantity: 1, dueDate: '', clientReference: '', shippingAddress: '' }));
      setTab('cases');
      await loadBase();
      await openCase(response.data.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear el caso.'); }
    finally { setBusy(false); }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault(); if (!selected || !message.trim()) return;
    setBusy(true); setError('');
    try {
      await api(`/cases/${selected.id}/messages`, { method: 'POST', body: JSON.stringify({ body: message, messageType: 'text' }) });
      setMessage(''); await openCase(selected.id); await loadBase();
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo enviar el mensaje.'); }
    finally { setBusy(false); }
  }

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError('');
    try {
      await api(`/cases/${selected.id}/payments`, { method: 'POST', body: JSON.stringify({ ...payment, amount: Number(payment.amount) }) });
      setPayment({ amount: '', reference: '', evidenceNote: '' }); setNotice('Comprobante registrado para revisión administrativa.'); await openCase(selected.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo registrar el pago.'); }
    finally { setBusy(false); }
  }

  async function reviewDesign(designId: string, decision: 'approved' | 'changes_requested') {
    if (!selected) return; setBusy(true); setError('');
    try {
      await api(`/cases/${selected.id}/design-review`, { method: 'POST', body: JSON.stringify({ designId, decision, comment: decision === 'approved' ? 'Diseño aprobado desde el portal.' : 'Se solicitan ajustes; revisar el mensaje del caso.' }) });
      setNotice(decision === 'approved' ? 'Diseño aprobado y comunicado al laboratorio.' : 'Cambios solicitados al laboratorio.'); await openCase(selected.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo revisar el diseño.'); }
    finally { setBusy(false); }
  }

  if (loading) return <Spinner label="Preparando el portal clínico…" />;

  const nav: Array<[Tab, string]> = [['dashboard','Resumen'],['cases','Casos'],['new','Crear caso'],['patients','Pacientes']];
  return <div className="space-y-6">
    <nav className="flex gap-2 overflow-x-auto pb-1">{nav.map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold ${tab === key ? 'bg-teal-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}>{label}</button>)}</nav>
    {error && <Alert>{error}</Alert>}{notice && <Alert type="success">{notice}</Alert>}

    {tab === 'dashboard' && dashboard && <section className="space-y-6">
      <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Vista 1 · Odontólogo</p><h1 className="mt-2 text-3xl font-bold text-slate-950">Control de casos clínicos</h1><p className="mt-2 max-w-3xl text-slate-600">Crea pedidos, conversa con el laboratorio, aprueba diseños y revisa producción, pagos y entrega en un solo lugar.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Casos activos" value={Object.entries(dashboard.statusCounts).filter(([key]) => !['delivered','cancelled','rejected'].includes(key)).reduce((sum,[,value]) => sum + Number(value),0)} /><Stat label="Monto de casos" value={money(dashboard.totalAmount)} /><Stat label="Pagos confirmados" value={money(dashboard.paidAmount)} /><Stat label="Mensajes pendientes" value={dashboard.unreadMessages || 0} /></div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div className={`${cardClass} p-6`}><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Casos recientes</h2><button className="text-sm font-semibold text-teal-700" onClick={() => setTab('cases')}>Ver todos</button></div><div className="mt-4 space-y-3">{cases.slice(0,5).map(item => <button key={item.id} onClick={() => openCase(item.id)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 text-left hover:border-teal-300 hover:bg-teal-50/40"><div><p className="font-semibold text-slate-900">{item.code} · {item.title}</p><p className="mt-1 text-sm text-slate-500">{item.patient?.name} · {item.tracking?.label || statusLabel[item.status]}</p></div><Badge status={item.status} /></button>)}{cases.length === 0 && <Empty title="No hay casos" detail="Crea el primer caso del piloto." />}</div></div><div className={`${cardClass} p-6`}><h2 className="text-lg font-bold">Distribución por estado</h2><div className="mt-5 space-y-3">{Object.entries(dashboard.statusCounts).map(([key,value]) => <div className="flex items-center justify-between" key={key}><span className="text-sm text-slate-600">{statusLabel[key] || key}</span><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold">{value}</span></div>)}</div></div></div>
    </section>}

    {tab === 'cases' && <section className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-bold">Lista de casos</h1><p className="mt-1 text-sm text-slate-500">Solo se muestran los casos de tu cuenta clínica.</p></div><input className={`${inputClass} !mt-0 max-w-sm`} placeholder="Buscar código, paciente o trabajo" value={search} onChange={e => setSearch(e.target.value)} /></div><div className="grid gap-4 xl:grid-cols-2">{filteredCases.map(item => <button key={item.id} onClick={() => openCase(item.id)} className={`${cardClass} p-5 text-left transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md`}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">{item.code}</p><h2 className="mt-1 text-lg font-bold text-slate-950">{item.title}</h2><p className="mt-1 text-sm text-slate-500">{item.patient?.name} · {item.patient?.internalId}</p></div><Badge status={item.status} /></div><div className="mt-4"><CaseTimeline tracking={item.tracking} /></div><div className="mt-4 flex flex-wrap justify-between gap-3 text-sm"><span className="text-slate-500">Creado {shortDate(item.createdAt)}</span><span className="font-semibold text-slate-900">{money(item.order?.total)} · saldo {money(item.order?.balance)}</span></div></button>)}{filteredCases.length === 0 && <div className="xl:col-span-2"><Empty title="No se encontraron casos" /></div>}</div></section>}

    {tab === 'new' && <section className={`${cardClass} mx-auto max-w-4xl p-6 md:p-8`}><div className="border-b border-slate-200 pb-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Nuevo pedido</p><h1 className="mt-2 text-2xl font-bold">Crear caso para el laboratorio</h1><p className="mt-2 text-sm text-slate-500">El código NuDental se genera automáticamente. La relación con la identidad completa del paciente permanece bajo control de la clínica.</p></div>{patients.length === 0 ? <div className="mt-6"><Alert type="info">Primero registra al menos un paciente o referencia clínica en la pestaña Pacientes.</Alert></div> : <form onSubmit={createCase} className="mt-6 grid gap-5 md:grid-cols-2"><Field label="Paciente / referencia"><select required className={inputClass} value={caseForm.patientId} onChange={e => setCaseForm({...caseForm,patientId:e.target.value})}>{patients.map(patient => <option key={patient.id} value={patient.id}>{patient.internalId} · {patient.name}</option>)}</select></Field><Field label="Producto"><select required className={inputClass} value={caseForm.productId} onChange={e => { const product=catalog.find(p=>p.id===e.target.value);setCaseForm({...caseForm,productId:e.target.value,material:product?.default_material||''}); }}>{catalog.map(product => <option key={product.id} value={product.id}>{product.name} · {money(product.unit_price)}</option>)}</select></Field><Field label="Título del caso"><input required minLength={2} maxLength={180} className={inputClass} value={caseForm.title} onChange={e => setCaseForm({...caseForm,title:e.target.value})} placeholder="Ej. Corona pieza 16" /></Field><Field label="Referencia de la clínica"><input className={inputClass} value={caseForm.clientReference} onChange={e => setCaseForm({...caseForm,clientReference:e.target.value})} placeholder="Código interno opcional" /></Field><Field label="Material"><input className={inputClass} value={caseForm.material} onChange={e => setCaseForm({...caseForm,material:e.target.value})} /></Field><Field label="Color"><input className={inputClass} value={caseForm.shade} onChange={e => setCaseForm({...caseForm,shade:e.target.value})} placeholder="Ej. A2" /></Field><Field label="Pieza FDI"><input className={inputClass} inputMode="numeric" value={caseForm.tooth} onChange={e => setCaseForm({...caseForm,tooth:e.target.value})} placeholder="Ej. 16" /></Field><Field label="Cantidad"><input required className={inputClass} type="number" min={1} max={50} value={caseForm.quantity} onChange={e => setCaseForm({...caseForm,quantity:Number(e.target.value)})} /></Field><Field label="Prioridad"><select className={inputClass} value={caseForm.urgency} onChange={e => setCaseForm({...caseForm,urgency:e.target.value})}><option value="standard">Estándar</option><option value="express">Urgente (recargo piloto 20 %)</option></select></Field><Field label="Fecha solicitada"><input className={inputClass} type="date" value={caseForm.dueDate} onChange={e => setCaseForm({...caseForm,dueDate:e.target.value})} /></Field><Field label="Modalidad de pago"><select className={inputClass} value={caseForm.paymentMode} onChange={e => setCaseForm({...caseForm,paymentMode:e.target.value})}><option value="advance_balance">Anticipo y saldo a la entrega</option><option value="pay_on_delivery">Pago total a la entrega</option><option value="monthly_invoice">Factura mensual (requiere crédito)</option></select></Field><Field label="Origen de información"><select className={inputClass} value={caseForm.submissionSource} onChange={e => setCaseForm({...caseForm,submissionSource:e.target.value})}><option value="manual">Carga manual</option><option value="panda">PANDA P3 Plus</option><option value="external">Escáner externo</option></select></Field><div className="md:col-span-2"><Field label="Prescripción e indicaciones"><textarea required rows={5} className={inputClass} value={caseForm.instructions} onChange={e => setCaseForm({...caseForm,instructions:e.target.value})} placeholder="Especificaciones clínicas y técnicas necesarias…" /></Field></div><div className="md:col-span-2"><Field label="Dirección de entrega"><textarea rows={2} className={inputClass} value={caseForm.shippingAddress} onChange={e => setCaseForm({...caseForm,shippingAddress:e.target.value})} /></Field></div><div className="md:col-span-2 flex justify-end"><button disabled={busy} className={buttonPrimary}>{busy?'Creando…':'Crear y enviar caso'}</button></div></form>}</section>}

    {tab === 'patients' && <section className="grid gap-6 lg:grid-cols-[360px_1fr]"><form onSubmit={createPatient} className={`${cardClass} h-fit p-6`}><h1 className="text-xl font-bold">Nueva referencia clínica</h1><p className="mt-2 text-sm text-slate-500">Para el piloto, la clínica administra estos datos. El laboratorio recibe solo lo necesario para identificar el pedido.</p><div className="mt-5 space-y-4"><Field label="Nombre"><input required minLength={2} className={inputClass} value={patientForm.name} onChange={e => setPatientForm({...patientForm,name:e.target.value})} /></Field><Field label="Código interno"><input required className={inputClass} value={patientForm.internalId} onChange={e => setPatientForm({...patientForm,internalId:e.target.value})} /></Field><Field label="Fecha de nacimiento"><input required className={inputClass} type="date" min="1900-01-01" max={new Date().toISOString().slice(0,10)} value={patientForm.birthDate} onChange={e => setPatientForm({...patientForm,birthDate:e.target.value})} /></Field><Field label="Género"><select className={inputClass} value={patientForm.gender} onChange={e => setPatientForm({...patientForm,gender:e.target.value})}><option>Otro</option><option>Femenino</option><option>Masculino</option></select></Field><button disabled={busy} className={`${buttonPrimary} w-full`}>Guardar</button></div></form><div className={`${cardClass} p-6`}><h2 className="text-xl font-bold">Pacientes / referencias de la clínica</h2><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Código</th><th className="p-3">Nombre</th><th className="p-3">Nacimiento</th><th className="p-3">Género</th></tr></thead><tbody>{patients.map(patient => <tr key={patient.id} className="border-b border-slate-100"><td className="p-3 font-semibold text-teal-700">{patient.internalId}</td><td className="p-3">{patient.name}</td><td className="p-3">{patient.birthDate}</td><td className="p-3">{patient.gender}</td></tr>)}</tbody></table>{patients.length === 0 && <Empty title="Sin registros" />}</div></div></section>}

    {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm md:items-center md:p-5" onMouseDown={e => { if(e.target===e.currentTarget)setSelected(null); }}><section className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl md:rounded-3xl"><header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur md:p-7"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">{selected.code}</p><h2 className="mt-1 text-2xl font-bold">{selected.title}</h2><p className="mt-1 text-sm text-slate-500">{selected.patient?.name} · {selected.patient?.internalId}</p></div><button className={buttonSecondary} onClick={() => setSelected(null)}>Cerrar</button></header><div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[1.35fr_1fr]"><div className="space-y-6"><section><div className="flex items-center justify-between"><h3 className="font-bold">Seguimiento</h3><Badge status={selected.status} /></div><div className="mt-3"><CaseTimeline tracking={selected.tracking} /></div></section><section><h3 className="font-bold">Trabajos solicitados</h3><div className="mt-3 space-y-3">{selected.items.map(item => <div className="rounded-xl border border-slate-200 p-4" key={item.id}><div className="flex justify-between gap-4"><div><p className="font-semibold">{item.name}</p><p className="mt-1 text-sm text-slate-500">{item.material || 'Material por confirmar'} {item.shade ? `· color ${item.shade}` : ''} {item.tooth ? `· pieza ${item.tooth}` : ''}</p></div><span className="font-bold">{money(Number(item.unit_price)*Number(item.quantity))}</span></div></div>)}</div></section>{selected.designs.length>0 && <section><h3 className="font-bold">Diseños</h3><div className="mt-3 space-y-3">{selected.designs.map(design => <div key={design.id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">Versión {design.version} · {design.model_label || 'Diseño CAD'}</p><p className="mt-1 text-xs text-slate-500">Estado: {design.status}</p></div><Badge status={design.status} /></div>{design.status==='pending' && <div className="mt-4 flex gap-2"><button disabled={busy} className={buttonPrimary} onClick={() => reviewDesign(design.id,'approved')}>Aprobar</button><button disabled={busy} className={buttonSecondary} onClick={() => reviewDesign(design.id,'changes_requested')}>Pedir cambios</button></div>}{design.review_comment && <p className="mt-3 text-sm text-slate-600">{design.review_comment}</p>}</div>)}</div></section>}<section><h3 className="font-bold">Conversación con el laboratorio</h3><div className="mt-3 max-h-80 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4">{selected.messages.map(item => <div key={item.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${['dentist','clinic_admin'].includes(item.author_role)?'ml-auto bg-teal-700 text-white':'bg-white text-slate-800 shadow-sm'}`}><p className="text-xs font-semibold opacity-75">{item.author_name} · {item.message_type}</p><p className="mt-1 whitespace-pre-wrap">{item.body}</p><p className="mt-2 text-[11px] opacity-60">{shortDate(item.created_at)}</p></div>)}{selected.messages.length===0 && <p className="text-sm text-slate-500">Aún no hay mensajes.</p>}</div><form onSubmit={sendMessage} className="mt-3 flex gap-2"><textarea className={inputClass} rows={2} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Escribe al laboratorio…" /><button disabled={busy||!message.trim()} className={buttonPrimary}>Enviar</button></form></section></div><aside className="space-y-5"><section className={`${cardClass} p-5`}><h3 className="font-bold">Estado económico</h3><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="font-bold">{money(selected.order?.total)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Pagado</dt><dd>{money(selected.order?.paidAmount)}</dd></div><div className="flex justify-between border-t pt-3"><dt className="font-semibold">Saldo</dt><dd className="font-bold text-teal-700">{money(selected.order?.balance)}</dd></div></dl>{(selected.order?.balance||0)>0 && <form onSubmit={submitPayment} className="mt-5 space-y-3 border-t pt-5"><p className="text-sm font-semibold">Registrar comprobante</p><input required className={inputClass} type="number" min="0.01" step="0.01" max={selected.order?.balance} placeholder="Importe" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})}/><input required className={inputClass} placeholder="N.º de operación / referencia" value={payment.reference} onChange={e=>setPayment({...payment,reference:e.target.value})}/><textarea className={inputClass} rows={2} placeholder="Nota opcional" value={payment.evidenceNote} onChange={e=>setPayment({...payment,evidenceNote:e.target.value})}/><button disabled={busy} className={`${buttonPrimary} w-full`}>Enviar para revisión</button></form>}<div className="mt-4 space-y-2">{selected.payments.map(item=><div className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm" key={item.id}><span>{money(item.amount)} · {item.reference}</span><Badge status={item.status}/></div>)}</div></section><section className={`${cardClass} p-5`}><h3 className="font-bold">Calidad y entrega</h3><div className="mt-4 space-y-3">{selected.qualityChecks.map(item=><div key={item.id} className="rounded-xl border p-3"><div className="flex justify-between"><span className="text-sm font-semibold">Control de calidad</span><Badge status={item.result}/></div><p className="mt-2 text-sm text-slate-600">{item.notes||'Sin observaciones'}</p></div>)}{selected.shipments.map(item=><div key={item.id} className="rounded-xl border p-3"><div className="flex justify-between"><span className="text-sm font-semibold">{item.carrier}</span><Badge status={item.status}/></div><p className="mt-2 text-sm text-slate-600">{item.tracking_code||'Sin código de seguimiento'} · {item.delivery_address}</p></div>)}{selected.qualityChecks.length===0&&selected.shipments.length===0&&<p className="text-sm text-slate-500">Todavía no hay liberación de calidad ni envío.</p>}</div></section><section className={`${cardClass} p-5`}><h3 className="font-bold">Indicaciones</h3><p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{selected.instructions||'Sin indicaciones adicionales.'}</p><p className="mt-4 text-xs text-slate-500">Fuente: {selected.source} · revisión {selected.revision}</p></section></aside></div></section></div>}
  </div>;
}
