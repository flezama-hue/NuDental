import type { Express, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db.js';
import { addAudit, addIntegrationEvent, addNotification, asyncRoute, caseListSql, caseStatuses, dateOnly, fail, finite, has, messageTypes, money, paymentModes, publicCase, publicPatient, publicUser, scopedCase, sha256, text, uuid } from '../support.js';

export function registerCoreRoutes(app: Express, db: Database, middleware: { authenticated: RequestHandler; clinical: RequestHandler }) {
  const { authenticated, clinical } = middleware;
  app.get('/api/auth/me', authenticated, (_req, res) => res.json({ user: publicUser(res.locals.user) }));

  app.get('/api/dashboard', authenticated, asyncRoute(async (_req, res) => {
    const u = res.locals.user;
    if (u.clinic_id) {
      const counts = await db.query(
        `SELECT status,COUNT(*)::int AS count FROM cases WHERE clinic_id=$1 GROUP BY status`,
        [u.clinic_id],
      );
      const finance = await db.query(
        `SELECT
          COALESCE((SELECT SUM(o.total) FROM orders o WHERE o.clinic_id=$1 AND o.status<>'cancelled'),0) AS total,
          COALESCE((SELECT SUM(p.amount) FROM payments p JOIN orders o ON o.clinic_id=p.clinic_id AND o.id=p.order_id
                    WHERE o.clinic_id=$1 AND o.status<>'cancelled' AND p.status='confirmed'),0) AS paid`,
        [u.clinic_id],
      );
      const messages = await db.query(
        `SELECT COUNT(*)::int AS count FROM case_comments m JOIN cases c ON c.clinic_id=m.clinic_id AND c.id=m.case_id
         WHERE c.clinic_id=$1 AND m.visibility='shared' AND m.author_id<>$2 AND m.read_at IS NULL`,
        [u.clinic_id, u.id],
      );
      return res.json({
        roleView: 'clinical',
        statusCounts: Object.fromEntries(counts.rows.map((r: any) => [r.status, Number(r.count)])),
        totalAmount: money(finance.rows[0]?.total),
        paidAmount: money(finance.rows[0]?.paid),
        unreadMessages: Number(messages.rows[0]?.count || 0),
      });
    }

    const counts = await db.query('SELECT status,COUNT(*)::int AS count FROM cases WHERE laboratory_id=$1 GROUP BY status', [u.laboratory_id]);
    const lowStock = await db.query(
      `SELECT COUNT(*)::int AS count FROM inventory_items WHERE laboratory_id=$1 AND active=true AND current_stock-reserved_stock<=minimum_stock`,
      [u.laboratory_id],
    );
    const shipments = await db.query(
      `SELECT COUNT(*)::int AS count FROM shipments s JOIN cases c ON c.clinic_id=s.clinic_id AND c.id=s.case_id
       WHERE c.laboratory_id=$1 AND s.status IN ('prepared','scheduled','dispatched','incident')`,
      [u.laboratory_id],
    );
    const payments = await db.query(
      `SELECT COUNT(*)::int AS count FROM payments p JOIN orders o ON o.clinic_id=p.clinic_id AND o.id=p.order_id
       JOIN cases c ON c.clinic_id=o.clinic_id AND c.id=o.case_id WHERE c.laboratory_id=$1 AND p.status='review'`,
      [u.laboratory_id],
    );
    res.json({
      roleView: 'administrative',
      statusCounts: Object.fromEntries(counts.rows.map((r: any) => [r.status, Number(r.count)])),
      lowStockItems: Number(lowStock.rows[0]?.count || 0),
      activeShipments: Number(shipments.rows[0]?.count || 0),
      paymentsToReview: Number(payments.rows[0]?.count || 0),
    });
  }));

  // ─────────────────────────────── System 1: patients and catalog
  app.get('/api/patients', authenticated, clinical, asyncRoute(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const query = text(req.query.q, 100);
    if (!Number.isInteger(limit) || !Number.isSafeInteger(offset)) return fail(res, 400, 'INVALID_INPUT', 'Paginación inválida.');
    const { rows } = await db.query(
      `SELECT id,name,birth_date::text,gender,internal_id FROM patients
       WHERE clinic_id=$1 AND ($4='' OR name ILIKE '%'||$4||'%' OR internal_id ILIKE '%'||$4||'%')
       ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,
      [res.locals.user.clinic_id, limit, offset, query],
    );
    res.json({ data: rows.map(publicPatient), limit, offset });
  }));

  app.get('/api/patients/:id', authenticated, clinical, asyncRoute(async (req, res) => {
    if (!uuid.test(req.params.id)) return fail(res, 400, 'INVALID_INPUT', 'Identificador inválido.');
    const { rows } = await db.query(
      'SELECT id,name,birth_date::text,gender,internal_id FROM patients WHERE clinic_id=$1 AND id=$2',
      [res.locals.user.clinic_id, req.params.id],
    );
    if (!rows[0]) return fail(res, 404, 'NOT_FOUND', 'Paciente no encontrado.');
    res.json({ data: publicPatient(rows[0]) });
  }));

  app.post('/api/patients', authenticated, clinical, asyncRoute(async (req, res) => {
    const body = req.body || {};
    if (Object.keys(body).some(key => !['name','birthDate','gender','internalId'].includes(key))) return fail(res, 400, 'INVALID_INPUT', 'Campos no admitidos. La clínica la determina tu sesión.');
    const name = text(body.name, 150);
    const internalId = text(body.internalId, 50);
    const date = body.birthDate;
    if (name.length < 2 || !internalId || !['Masculino','Femenino','Otro'].includes(body.gender)) return fail(res, 400, 'INVALID_INPUT', 'Revisa nombre, código interno y género.');
    if (!dateOnly(date) || date < '1900-01-01' || date > new Date().toISOString().slice(0, 10)) return fail(res, 400, 'INVALID_INPUT', 'Fecha de nacimiento inválida.');
    const { rows } = await db.query(
      `INSERT INTO patients(id,clinic_id,name,birth_date,gender,internal_id,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,birth_date::text,gender,internal_id`,
      [randomUUID(), res.locals.user.clinic_id, name, date, body.gender, internalId, res.locals.user.id],
    );
    await addAudit(db, res.locals.user.id, 'patient.created', 'patient', rows[0].id);
    res.status(201).json({ data: publicPatient(rows[0]) });
  }));

  app.get('/api/catalog', authenticated, asyncRoute(async (_req, res) => {
    const u = res.locals.user;
    const clinicId = u.clinic_id || null;
    const params = clinicId ? [clinicId] : [];
    const where = clinicId
      ? `LEFT JOIN clinic_price_lists cpl ON cpl.clinic_id=$1
         LEFT JOIN price_list_items pli ON pli.price_list_id=cpl.price_list_id AND pli.product_id=p.id`
      : 'LEFT JOIN price_list_items pli ON false';
    const { rows } = await db.query(
      `SELECT p.id,p.code,p.name,p.category,p.default_material,p.turnaround_days,p.requires_design_approval,
        COALESCE(pli.unit_price,p.base_price) AS unit_price
       FROM catalog_products p ${where} WHERE p.active=true ORDER BY p.category,p.name`,
      params,
    );
    res.json({ data: rows.map((r: any) => ({ ...r, unit_price: money(r.unit_price) })) });
  }));

  // ─────────────────────────────── Systems 1 and 2: cases, files and communication
  app.get('/api/cases', authenticated, asyncRoute(async (req, res) => {
    const u = res.locals.user;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const status = text(req.query.status, 30);
    const query = text(req.query.q, 100);
    if (status && !has(caseStatuses, status)) return fail(res, 400, 'INVALID_INPUT', 'Estado no válido.');
    const scopeField = u.clinic_id ? 'c.clinic_id' : 'c.laboratory_id';
    const scope = u.clinic_id || u.laboratory_id;
    const sql = caseListSql(`${scopeField}=$1 AND ($2='' OR c.status=$2) AND ($3='' OR c.reference_code ILIKE '%'||$3||'%' OR c.title ILIKE '%'||$3||'%' OR p.name ILIKE '%'||$3||'%')`)
      + ' ORDER BY c.created_at DESC,c.id DESC LIMIT $4 OFFSET $5';
    const { rows } = await db.query(sql, [scope, status, query, limit, offset]);
    res.json({ data: rows.map(publicCase), limit, offset });
  }));

  app.post('/api/cases', authenticated, clinical, asyncRoute(async (req, res) => {
    const body = req.body || {};
    const patientId = body.patientId;
    const productId = body.productId;
    const title = text(body.title, 180);
    const instructions = text(body.instructions, 5000);
    const material = text(body.material, 120);
    const shade = text(body.shade, 50);
    const clientReference = text(body.clientReference, 100) || null;
    const shippingAddress = text(body.shippingAddress, 500);
    const quantity = Math.max(1, Math.min(50, Number(body.quantity) || 1));
    const tooth = body.tooth == null || body.tooth === '' ? null : Number(body.tooth);
    const urgency = body.urgency === 'express' ? 'express' : 'standard';
    const source = ['manual','panda','external'].includes(body.submissionSource) ? body.submissionSource : 'manual';
    const dueDate = body.dueDate || null;
    const requestedMode = body.paymentMode || null;
    if (!uuid.test(patientId) || !uuid.test(productId) || title.length < 2 || !Number.isInteger(quantity)) return fail(res, 400, 'INVALID_INPUT', 'Revisa paciente, producto, título y cantidad.');
    if (tooth !== null && (!Number.isInteger(tooth) || tooth < 11 || tooth > 48)) return fail(res, 400, 'INVALID_INPUT', 'La pieza dental FDI no es válida.');
    if (dueDate && !dateOnly(dueDate)) return fail(res, 400, 'INVALID_INPUT', 'Fecha solicitada inválida.');
    if (requestedMode && !has(paymentModes, requestedMode)) return fail(res, 400, 'INVALID_INPUT', 'Modalidad de pago no válida.');

    const result = await db.transaction(async tx => {
      const patient = await tx.query('SELECT id FROM patients WHERE clinic_id=$1 AND id=$2', [res.locals.user.clinic_id, patientId]);
      if (!patient.rows[0]) return { error: [404, 'NOT_FOUND', 'Paciente no encontrado.'] as const };
      const product = await tx.query(
        `SELECT p.*,COALESCE(pli.unit_price,p.base_price) AS unit_price,COALESCE(pli.turnaround_days,p.turnaround_days) AS priced_turnaround
         FROM catalog_products p
         LEFT JOIN clinic_price_lists cpl ON cpl.clinic_id=$1
         LEFT JOIN price_list_items pli ON pli.price_list_id=cpl.price_list_id AND pli.product_id=p.id
         WHERE p.id=$2 AND p.active=true`,
        [res.locals.user.clinic_id, productId],
      );
      if (!product.rows[0]) return { error: [404, 'NOT_FOUND', 'Producto no disponible.'] as const };
      const relation = await tx.query('SELECT laboratory_id FROM clinic_laboratories WHERE clinic_id=$1 AND active=true', [res.locals.user.clinic_id]);
      if (!relation.rows[0]) return { error: [409, 'LAB_NOT_CONFIGURED', 'La clínica todavía no tiene laboratorio asignado.'] as const };
      const clinic = await tx.query('SELECT default_payment_mode,credit_limit,billing_address FROM clinics WHERE id=$1 AND active=true', [res.locals.user.clinic_id]);
      if (!clinic.rows[0]) return { error: [409, 'CLINIC_DISABLED', 'La cuenta de la clínica no está activa.'] as const };
      const paymentMode = requestedMode || clinic.rows[0].default_payment_mode;
      if (paymentMode === 'monthly_invoice' && money(clinic.rows[0].credit_limit) <= 0) return { error: [409, 'CREDIT_NOT_APPROVED', 'La clínica no tiene crédito mensual habilitado.'] as const };

      const caseId = randomUUID();
      const caseItemId = randomUUID();
      const orderId = randomUUID();
      const referenceCode = `NUD-${new Date().getFullYear()}-${caseId.slice(0, 8).toUpperCase()}`;
      const unitPrice = money(product.rows[0].unit_price);
      const subtotal = Math.round(unitPrice * quantity * 100) / 100;
      const expressFee = urgency === 'express' ? Math.round(subtotal * 0.2 * 100) / 100 : 0;
      const total = subtotal + expressFee;
      const depositPercent = paymentMode === 'advance_balance' ? 10 : 0;
      const depositAmount = Math.round(total * depositPercent) / 100;
      const address = shippingAddress || clinic.rows[0].billing_address || '';
      const initialStatus = 'submitted';

      await tx.query(
        `INSERT INTO cases(id,clinic_id,patient_id,laboratory_id,created_by,title,instructions,status,urgency,due_date,reference_code,client_reference,shipping_address,submission_source,submitted_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now())`,
        [caseId,res.locals.user.clinic_id,patientId,relation.rows[0].laboratory_id,res.locals.user.id,title,instructions,initialStatus,urgency,dueDate,referenceCode,clientReference,address,source],
      );
      await tx.query(
        `INSERT INTO case_items(id,clinic_id,case_id,product_id,tooth,material,shade,quantity,unit_price,prescription)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [caseItemId,res.locals.user.clinic_id,caseId,productId,tooth,material || product.rows[0].default_material,shade,quantity,unitPrice,JSON.stringify(body.prescription || {})],
      );
      await tx.query(
        `INSERT INTO orders(id,clinic_id,case_id,idempotency_key,subtotal,express_fee,total,payment_mode,deposit_percent,deposit_amount,accepted_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [orderId,res.locals.user.clinic_id,caseId,`case:${caseId}`,subtotal,expressFee,total,paymentMode,depositPercent,depositAmount,res.locals.user.id],
      );
      await tx.query(
        `INSERT INTO case_tracking_snapshots(id,clinic_id,case_id,stage,customer_label,progress_kind,source,updated_by)
         VALUES($1,$2,$3,'intake','Enviado al laboratorio','unavailable','manual',$4)`,
        [randomUUID(),res.locals.user.clinic_id,caseId,res.locals.user.id],
      );
      await tx.query(
        `INSERT INTO case_events(id,clinic_id,case_id,actor_id,event_type,to_status) VALUES($1,$2,$3,$4,'case_submitted',$5)`,
        [randomUUID(),res.locals.user.clinic_id,caseId,res.locals.user.id,initialStatus],
      );
      await addIntegrationEvent(tx,'mrp','case_submitted','case',caseId,{ caseId,referenceCode,revision:1 },`case_submitted:${caseId}:1`);
      await addAudit(tx,res.locals.user.id,'case.created','case',caseId,{ referenceCode,productId,quantity,paymentMode });
      return { caseId };
    });
    if ('error' in result) return fail(res, result.error[0], result.error[1], result.error[2]);
    const row = await scopedCase(db, res.locals.user, result.caseId);
    res.status(201).json({ data: publicCase(row) });
  }));

  app.get('/api/cases/:id', authenticated, asyncRoute(async (req, res) => {
    const row = await scopedCase(db, res.locals.user, req.params.id);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Caso no encontrado.');
    const [items, files, designs, messages, payments, shipments, quality, assignments] = await Promise.all([
      db.query(`SELECT ci.id,ci.product_id,p.code,p.name,ci.tooth,ci.material,ci.shade,ci.quantity,ci.unit_price,ci.prescription,ci.technical_revision
                FROM case_items ci JOIN catalog_products p ON p.id=ci.product_id WHERE ci.clinic_id=$1 AND ci.case_id=$2 ORDER BY ci.id`, [row.clinic_id,row.id]),
      db.query('SELECT id,original_name,media_type,bytes,sha256,created_at FROM case_files WHERE clinic_id=$1 AND case_id=$2 ORDER BY created_at DESC', [row.clinic_id,row.id]),
      db.query(`SELECT d.id,d.file_id,d.version,d.status,d.model_label,d.review_comment,d.reviewed_at
                FROM design_versions d WHERE d.clinic_id=$1 AND d.case_id=$2 ORDER BY d.version DESC`, [row.clinic_id,row.id]),
      db.query(`SELECT m.id,m.author_id,u.name AS author_name,u.role AS author_role,m.body,m.message_type,m.visibility,m.created_at,m.read_at
                FROM case_comments m JOIN app_users u ON u.id=m.author_id
                WHERE m.clinic_id=$1 AND m.case_id=$2 AND ($3::boolean OR m.visibility='shared') ORDER BY m.created_at`, [row.clinic_id,row.id,Boolean(res.locals.user.laboratory_id)]),
      db.query(`SELECT p.id,p.amount,p.status,p.reference,p.evidence_note,p.created_at,p.reconciled_at
                FROM payments p JOIN orders o ON o.clinic_id=p.clinic_id AND o.id=p.order_id
                WHERE o.clinic_id=$1 AND o.case_id=$2 ORDER BY p.created_at DESC`, [row.clinic_id,row.id]),
      db.query('SELECT id,carrier,service,tracking_code,status,delivery_address,collection_instruction,scheduled_at,dispatched_at,delivered_at,received_by_name,created_at FROM shipments WHERE clinic_id=$1 AND case_id=$2 ORDER BY created_at DESC', [row.clinic_id,row.id]),
      db.query(`SELECT q.id,q.result,q.criteria,q.notes,q.checked_at,u.name AS checked_by_name
                FROM quality_checks q JOIN app_users u ON u.id=q.checked_by WHERE q.clinic_id=$1 AND q.case_id=$2 ORDER BY q.checked_at DESC`, [row.clinic_id,row.id]),
      db.query('SELECT id,visible_name,responsibility,stage,active,assigned_at,ended_at FROM case_assignments WHERE clinic_id=$1 AND case_id=$2 ORDER BY assigned_at DESC', [row.clinic_id,row.id]),
    ]);
    if (res.locals.user.clinic_id) await db.query('UPDATE case_comments SET read_at=COALESCE(read_at,now()) WHERE clinic_id=$1 AND case_id=$2 AND author_id<>$3 AND visibility=\'shared\'', [row.clinic_id,row.id,res.locals.user.id]);
    res.json({
      data: {
        ...publicCase(row),
        items: items.rows.map((item: any) => ({ ...item, unit_price: money(item.unit_price) })),
        files: files.rows,
        designs: designs.rows,
        messages: messages.rows,
        payments: payments.rows.map((payment: any) => ({ ...payment, amount: money(payment.amount) })),
        shipments: shipments.rows,
        qualityChecks: quality.rows,
        assignments: assignments.rows,
      },
    });
  }));

  app.post('/api/cases/:id/files', authenticated, asyncRoute(async (req, res) => {
    const row = await scopedCase(db, res.locals.user, req.params.id);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Caso no encontrado.');
    const originalName = text(req.body?.originalName, 255);
    const mediaType = text(req.body?.mediaType, 120);
    const objectKey = text(req.body?.objectKey, 500);
    const bytes = Number(req.body?.bytes);
    const hash = text(req.body?.sha256, 64).toLowerCase();
    const purpose = req.body?.purpose === 'design' ? 'design' : 'attachment';
    if (!originalName || !mediaType || !objectKey || !Number.isSafeInteger(bytes) || bytes <= 0 || !sha256.test(hash)) return fail(res, 400, 'INVALID_INPUT', 'Metadatos del archivo inválidos. El archivo debe cargarse primero en almacenamiento privado.');
    const fileId = randomUUID();
    await db.transaction(async tx => {
      await tx.query(
        `INSERT INTO case_files(id,clinic_id,case_id,object_key,original_name,media_type,bytes,sha256,uploaded_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [fileId,row.clinic_id,row.id,objectKey,originalName,mediaType,bytes,hash,res.locals.user.id],
      );
      if (purpose === 'design') {
        if (!res.locals.user.laboratory_id) throw Object.assign(new Error('Solo el laboratorio publica diseños.'), { status: 403, code: 'FORBIDDEN' });
        const version = await tx.query('SELECT COALESCE(MAX(version),0)+1 AS next FROM design_versions WHERE clinic_id=$1 AND case_id=$2', [row.clinic_id,row.id]);
        await tx.query(
          `INSERT INTO design_versions(id,clinic_id,case_id,file_id,version,status,model_label)
           VALUES($1,$2,$3,$4,$5,'pending',$6)`,
          [randomUUID(),row.clinic_id,row.id,fileId,Number(version.rows[0].next),text(req.body?.modelLabel,120) || originalName],
        );
        await tx.query('UPDATE cases SET status=\'design_review\',updated_at=now() WHERE clinic_id=$1 AND id=$2', [row.clinic_id,row.id]);
      }
      await addIntegrationEvent(tx,'mrp','file_registered','case',row.id,{ caseId:row.id,fileId,purpose,sha256:hash },`file_registered:${fileId}`);
      await addAudit(tx,res.locals.user.id,'file.registered','case_file',fileId,{ caseId:row.id,purpose });
    });
    res.status(201).json({ data: { id:fileId,originalName,mediaType,bytes,sha256:hash,purpose } });
  }));

  app.post('/api/cases/:id/messages', authenticated, asyncRoute(async (req, res) => {
    const row = await scopedCase(db, res.locals.user, req.params.id);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Caso no encontrado.');
    const body = text(req.body?.body, 5000);
    const type = has(messageTypes, req.body?.messageType) ? req.body.messageType : 'text';
    const visibility = res.locals.user.laboratory_id && req.body?.visibility === 'internal' ? 'internal' : 'shared';
    if (!body) return fail(res, 400, 'INVALID_INPUT', 'Escribe un mensaje.');
    const messageId = randomUUID();
    await db.transaction(async tx => {
      await tx.query(
        `INSERT INTO case_comments(id,clinic_id,case_id,author_id,body,message_type,visibility)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [messageId,row.clinic_id,row.id,res.locals.user.id,body,type,visibility],
      );
      await tx.query('UPDATE cases SET last_message_at=now(),updated_at=now() WHERE clinic_id=$1 AND id=$2', [row.clinic_id,row.id]);
      if (visibility === 'shared') {
        const recipientType = res.locals.user.clinic_id ? 'laboratory' : 'clinic';
        const recipientId = res.locals.user.clinic_id ? row.laboratory_id : row.clinic_id;
        await addNotification(tx,'in_app',recipientType,recipientId,'case_message',{ caseId:row.id,messageId,type },`in_app:case_message:${messageId}`);
      }
      await addIntegrationEvent(tx,'mrp','message_created','case',row.id,{ caseId:row.id,messageId,type,visibility },`message_created:${messageId}`);
      await addAudit(tx,res.locals.user.id,'message.created','case_comment',messageId,{ caseId:row.id,type,visibility });
    });
    res.status(201).json({ data: { id:messageId,body,messageType:type,visibility,authorName:res.locals.user.name,createdAt:new Date().toISOString() } });
  }));

  app.post('/api/cases/:id/design-review', authenticated, clinical, asyncRoute(async (req, res) => {
    const row = await scopedCase(db, res.locals.user, req.params.id);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Caso no encontrado.');
    const designId = req.body?.designId;
    const decision = req.body?.decision;
    const comment = text(req.body?.comment, 2000);
    if (!uuid.test(designId) || !['approved','changes_requested'].includes(decision)) return fail(res, 400, 'INVALID_INPUT', 'Revisión de diseño inválida.');
    const { rows } = await db.query(
      `UPDATE design_versions SET status=$1,review_comment=$2,reviewed_by=$3,reviewed_at=now()
       WHERE id=$4 AND clinic_id=$5 AND case_id=$6 AND status='pending' RETURNING id,version,status,reviewed_at`,
      [decision,comment,res.locals.user.id,designId,row.clinic_id,row.id],
    );
    if (!rows[0]) return fail(res, 409, 'DESIGN_NOT_PENDING', 'El diseño no existe o ya fue revisado.');
    await addIntegrationEvent(db,'mrp','design_reviewed','case',row.id,{ caseId:row.id,designId,decision,version:rows[0].version },`design_reviewed:${designId}:${decision}`);
    await addAudit(db,res.locals.user.id,'design.reviewed','design_version',designId,{ caseId:row.id,decision });
    res.json({ data: rows[0] });
  }));

  app.post('/api/cases/:id/payments', authenticated, clinical, asyncRoute(async (req, res) => {
    const row = await scopedCase(db, res.locals.user, req.params.id);
    if (!row?.order_id) return fail(res, 404, 'NOT_FOUND', 'Orden no encontrada.');
    const amount = finite(req.body?.amount);
    const reference = text(req.body?.reference, 200);
    const evidenceNote = text(req.body?.evidenceNote, 1000);
    if (!Number.isFinite(amount) || amount <= 0 || !reference) return fail(res, 400, 'INVALID_INPUT', 'Ingresa importe y referencia del pago.');
    if (amount > money(row.total) - money(row.paid_amount) + 0.01) return fail(res, 409, 'PAYMENT_EXCEEDS_BALANCE', 'El importe supera el saldo del caso.');
    const id = randomUUID();
    await db.query(
      `INSERT INTO payments(id,clinic_id,order_id,amount,status,reference,external_reference,evidence_note)
       VALUES($1,$2,$3,$4,'review',$5,$6,$7)`,
      [id,row.clinic_id,row.order_id,amount,reference,`manual:${row.clinic_id}:${reference}`,evidenceNote],
    );
    await addAudit(db,res.locals.user.id,'payment.submitted','payment',id,{ caseId:row.id,amount });
    res.status(201).json({ data: { id,amount,status:'review',reference } });
  }));

  // ─────────────────────────────── System 2: case administration and QA
}
