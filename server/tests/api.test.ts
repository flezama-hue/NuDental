import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { createApp } from '../app.js';
import { migrate, type Database, type Queryable } from '../db.js';
import { seedLocal } from '../seed.js';

function adapter(connection: any): Queryable {
  return { query: (sql, params) => connection.query(sql, params), exec: sql => connection.exec(sql) };
}

test('NuDental v0.2: vistas 1 y 2, aislamiento e integración', async t => {
  const raw: any = new PGlite();
  await raw.waitReady;
  const db: Database = {
    ...adapter(raw),
    close: () => raw.close(),
    transaction: work => raw.transaction((tx: any) => work(adapter(tx))),
  };
  await migrate(db);
  await migrate(db); // las migraciones deben ser idempotentes por versión
  const password = randomBytes(20).toString('hex');
  const seed = await seedLocal(db, password);
  const app = await createApp(db, { origin: 'http://localhost:3000' });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  t.after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); await db.close(); });

  async function req(path: string, method = 'GET', body?: unknown, cookie = '', origin = 'http://localhost:3000') {
    return fetch(base + '/api' + path, {
      method,
      headers: { Origin: origin, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function json(path: string, method = 'GET', body?: unknown, cookie = '') {
    const response = await req(path, method, body, cookie);
    const data = response.status === 204 ? null : await response.json();
    return { response, data };
  }
  async function login(email: string) {
    const response = await req('/auth/login', 'POST', { email, password });
    assert.equal(response.status, 200);
    return { response, cookie: response.headers.get('set-cookie')!.split(';')[0] };
  }

  let clinicA = '';
  let clinicB = '';
  let technician = '';
  let manager = '';
  let patientId = '';
  let caseId = '';
  let orderId = '';
  let designId = '';
  let paymentId = '';
  let shipmentId = '';

  await t.test('autentica perfiles y protege la cookie', async () => {
    const bad = await req('/auth/login', 'POST', { email: 'dentista.a@example.test', password: 'incorrecta' });
    assert.equal(bad.status, 401);
    assert.equal(bad.headers.get('set-cookie'), null);
    const a = await login('dentista.a@example.test'); clinicA = a.cookie;
    clinicB = (await login('dentista.b@example.test')).cookie;
    technician = (await login('laboratorio@example.test')).cookie;
    manager = (await login('admin.laboratorio@example.test')).cookie;
    assert.match(a.response.headers.get('set-cookie')!, /HttpOnly/i);
    assert.match(a.response.headers.get('set-cookie')!, /SameSite=Lax/i);
    const data = await a.response.json();
    assert.equal(data.user.clinicId, seed.clinicA);
    assert.equal(data.user.role, 'dentist');
    assert.ok(!JSON.stringify(data).includes('password_hash'));
  });

  await t.test('rechaza sesión ausente, token inventado y origen externo', async () => {
    assert.equal((await req('/patients')).status, 401);
    assert.equal((await req('/patients', 'GET', undefined, 'nudental_session=' + 'f'.repeat(64))).status, 401);
    assert.equal((await req('/auth/logout', 'POST', {}, clinicA, 'https://externo.example')).status, 403);
  });

  await t.test('crea paciente y mantiene aislamiento entre clínicas', async () => {
    const create = await json('/patients', 'POST', { name: 'Paciente ficticio A', birthDate: '1998-04-20', gender: 'Otro', internalId: 'A-001' }, clinicA);
    assert.equal(create.response.status, 201);
    patientId = create.data.data.id;
    assert.equal(create.data.data.birthDate, '1998-04-20');
    assert.equal((await req('/patients/' + patientId, 'GET', undefined, clinicB)).status, 404);
    const listB = await json('/patients', 'GET', undefined, clinicB);
    assert.deepEqual(listB.data.data, []);
    assert.equal((await req('/patients', 'GET', undefined, technician)).status, 403);
    assert.equal((await req('/patients', 'POST', { name: 'Fecha mala', birthDate: '2000-02-31', gender: 'Otro', internalId: 'BAD' }, clinicA)).status, 400);
  });

  await t.test('crea un caso clínico con precio, orden y evento MRP', async () => {
    const catalog = await json('/catalog', 'GET', undefined, clinicA);
    assert.equal(catalog.response.status, 200);
    assert.ok(catalog.data.data.length >= 3);
    const product = catalog.data.data.find((item: any) => item.code === 'COR-ZIR-MONO');
    const create = await json('/cases', 'POST', {
      patientId,
      productId: product.id,
      title: 'Corona monolítica pieza 16',
      instructions: 'Zirconio A2, revisar contacto proximal.',
      material: 'Zirconio', shade: 'A2', tooth: 16, quantity: 1,
      urgency: 'standard', paymentMode: 'advance_balance', clientReference: 'CL-A-0001',
      shippingAddress: 'Pueblo Libre, Lima', submissionSource: 'panda',
    }, clinicA);
    assert.equal(create.response.status, 201);
    caseId = create.data.data.id;
    orderId = create.data.data.order.id;
    assert.match(create.data.data.code, /^NUD-\d{4}-/);
    assert.equal(create.data.data.order.total, 300);
    assert.equal(create.data.data.order.depositAmount, 30);
    const queue = await json('/admin/integrations/outbox', 'GET', undefined, manager);
    assert.ok(queue.data.data.some((event: any) => event.aggregate_id === caseId && event.event_type === 'case_submitted'));
  });

  await t.test('la otra clínica no ve el caso y el laboratorio asignado sí', async () => {
    assert.equal((await req('/cases/' + caseId, 'GET', undefined, clinicB)).status, 404);
    const listB = await json('/cases', 'GET', undefined, clinicB);
    assert.equal(listB.data.data.length, 0);
    const lab = await json('/cases/' + caseId, 'GET', undefined, technician);
    assert.equal(lab.response.status, 200);
    assert.equal(lab.data.data.patient.internalId, 'A-001');
  });

  await t.test('mantiene conversación compartida y comentarios internos separados', async () => {
    assert.equal((await req('/cases/' + caseId + '/messages', 'POST', { body: '¿Podrían confirmar la recepción?', messageType: 'technical_query' }, clinicA)).status, 201);
    assert.equal((await req('/cases/' + caseId + '/messages', 'POST', { body: 'Nota interna del laboratorio', visibility: 'internal' }, technician)).status, 201);
    const clinic = await json('/cases/' + caseId, 'GET', undefined, clinicA);
    assert.equal(clinic.data.data.messages.length, 1);
    const lab = await json('/cases/' + caseId, 'GET', undefined, technician);
    assert.equal(lab.data.data.messages.length, 2);
  });

  await t.test('registra diseño versionado y aprobación formal', async () => {
    const file = await json('/cases/' + caseId + '/files', 'POST', {
      originalName: 'diseno-v1.stl', mediaType: 'model/stl', objectKey: `private/${caseId}/design-v1.stl`,
      bytes: 2048, sha256: 'a'.repeat(64), purpose: 'design', modelLabel: 'Diseño corona v1',
    }, technician);
    assert.equal(file.response.status, 201);
    const detail = await json('/cases/' + caseId, 'GET', undefined, clinicA);
    designId = detail.data.data.designs[0].id;
    const review = await json('/cases/' + caseId + '/design-review', 'POST', { designId, decision: 'approved', comment: 'Aprobado para fabricar.' }, clinicA);
    assert.equal(review.response.status, 200);
    assert.equal(review.data.data.status, 'approved');
    assert.equal((await req('/cases/' + caseId + '/design-review', 'POST', { designId, decision: 'approved' }, clinicA)).status, 409);
  });

  await t.test('administra estado, seguimiento y calidad sin confundir progreso estimado con medido', async () => {
    assert.equal((await req('/admin/cases/' + caseId + '/status', 'PATCH', { status: 'production' }, technician)).status, 200);
    const tracking = await json('/admin/cases/' + caseId + '/tracking', 'POST', {
      stage: 'milling', label: 'Fresado en proceso', progressPercent: 45, progressKind: 'estimated', responsibleName: 'Equipo CAD/CAM', source: 'manual',
    }, technician);
    assert.equal(tracking.response.status, 200);
    assert.equal(tracking.data.data.progressKind, 'estimated');
    const quality = await json('/admin/cases/' + caseId + '/quality-checks', 'POST', { result: 'approved', notes: 'Ajuste y contactos dentro de tolerancia.' }, technician);
    assert.equal(quality.response.status, 201);
    const detail = await json('/cases/' + caseId, 'GET', undefined, clinicA);
    assert.equal(detail.data.data.tracking.progressPercent, 100);
    assert.equal(detail.data.data.qualityChecks[0].result, 'approved');
  });

  await t.test('registra pago, exige conciliación y actualiza saldo', async () => {
    const payment = await json('/cases/' + caseId + '/payments', 'POST', { amount: 30, reference: 'YAPE-001', evidenceNote: 'Operación ficticia' }, clinicA);
    assert.equal(payment.response.status, 201);
    paymentId = payment.data.data.id;
    const managerView = await json('/admin/payments?status=review', 'GET', undefined, manager);
    assert.ok(managerView.data.data.some((item: any) => item.id === paymentId));
    assert.equal((await req('/admin/payments/' + paymentId, 'PATCH', { status: 'confirmed' }, technician)).status, 403);
    assert.equal((await req('/admin/payments/' + paymentId, 'PATCH', { status: 'confirmed' }, manager)).status, 200);
    const detail = await json('/cases/' + caseId, 'GET', undefined, clinicA);
    assert.equal(detail.data.data.order.paidAmount, 30);
    assert.equal(detail.data.data.order.balance, 270);
    assert.equal(detail.data.data.order.id, orderId);
  });

  await t.test('prepara, despacha y confirma entrega con instrucción de cobranza', async () => {
    const create = await json('/admin/shipments', 'POST', { caseId, carrier: 'Courier piloto', deliveryAddress: 'Pueblo Libre, Lima' }, technician);
    assert.equal(create.response.status, 201);
    shipmentId = create.data.data.id;
    assert.equal(create.data.data.collectionInstruction, 'collect_balance');
    assert.equal((await req('/admin/shipments/' + shipmentId, 'PATCH', { status: 'dispatched', trackingCode: 'TRK-001' }, technician)).status, 200);
    assert.equal((await req('/admin/shipments/' + shipmentId, 'PATCH', { status: 'delivered', receivedByName: 'Recepción clínica' }, technician)).status, 200);
    const detail = await json('/cases/' + caseId, 'GET', undefined, clinicA);
    assert.equal(detail.data.data.status, 'delivered');
    assert.equal(detail.data.data.shipments[0].status, 'delivered');
  });

  await t.test('emite factura piloto solo con entrega confirmada', async () => {
    const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const invoice = await json('/admin/invoices', 'POST', { caseId, dueDate: due, invoiceNumber: 'F-PILOTO-0001' }, manager);
    assert.equal(invoice.response.status, 201);
    assert.equal(invoice.data.data.total, 300);
    const list = await json('/admin/invoices', 'GET', undefined, manager);
    assert.ok(list.data.data.some((item: any) => item.invoice_number === 'F-PILOTO-0001'));
  });

  await t.test('controla stock, reservas y compras con permisos', async () => {
    const inv = await json('/admin/inventory', 'GET', undefined, technician);
    const item = inv.data.data.find((entry: any) => entry.sku === 'ZIR-DISC-A2');
    const movement = await json('/admin/inventory/' + item.id + '/movements', 'POST', { movementType: 'reservation', quantity: 1, notes: 'Reserva caso piloto' }, technician);
    assert.equal(movement.response.status, 201);
    assert.equal(movement.data.data.reservedStock, 1);
    assert.equal((await req('/admin/inventory/' + item.id + '/movements', 'POST', { movementType: 'reservation', quantity: 100 }, technician)).status, 409);
    assert.equal((await req('/admin/inventory', 'POST', { sku: 'X', name: 'No autorizado', unit: 'u', minimumStock: 0 }, technician)).status, 403);
    const suppliers = await json('/admin/suppliers', 'GET', undefined, manager);
    const supplier = suppliers.data.data[0];
    const po = await json('/admin/purchase-orders', 'POST', { supplierId: supplier.id, items: [{ inventoryItemId: item.id, quantity: 2, unitCost: 100 }] }, manager);
    assert.equal(po.response.status, 201);
    assert.equal(po.data.data.total, 200);
  });

  await t.test('gestiona clientes y precios solo con rol administrativo', async () => {
    assert.equal((await req('/admin/clients', 'GET', undefined, technician)).status, 403);
    const clients = await json('/admin/clients', 'GET', undefined, manager);
    const client = clients.data.data.find((entry: any) => entry.id === seed.clinicA);
    assert.equal(client.default_payment_mode, 'advance_balance');
    const prices = await json('/admin/price-lists', 'GET', undefined, manager);
    const row = prices.data.data.find((entry: any) => entry.product_id === seed.products.zirconia);
    assert.equal((await req(`/admin/price-lists/${row.id}/items/${row.product_id}`, 'PUT', { unitPrice: 310, turnaroundDays: 8 }, manager)).status, 200);
  });

  await t.test('la base local conserva datos al cerrar y reabrir', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'nudental-persist-'));
    try {
      let disk: any = new PGlite(dir); await disk.waitReady;
      await disk.exec("CREATE TABLE evidence (id integer PRIMARY KEY, value text NOT NULL); INSERT INTO evidence VALUES(1,'persistente')");
      await disk.close();
      disk = new PGlite(dir); await disk.waitReady;
      assert.equal((await disk.query('SELECT value FROM evidence WHERE id=1')).rows[0].value, 'persistente');
      await disk.close();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
