import type { Express, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db.js';
import { addAudit, addIntegrationEvent, addNotification, asyncRoute, caseStatuses, dateOnly, fail, finite, has, money, movementTypes, paymentModes, scopedCase, text, uuid } from '../support.js';

export function registerCasesFinanceRoutes(app: Express, db: Database, middleware: { authenticated: RequestHandler; laboratory: RequestHandler; manager: RequestHandler }) {
  const { authenticated, laboratory, manager } = middleware;
  app.patch('/api/admin/cases/:id/status', authenticated, laboratory, asyncRoute(async (req, res) => {
    const row = await scopedCase(db, res.locals.user, req.params.id);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Caso no encontrado.');
    const status = req.body?.status;
    if (!has(caseStatuses, status) || ['draft','shipped','delivered'].includes(status)) return fail(res, 400, 'INVALID_INPUT', 'Estado no permitido por esta operación.');
    const transitions: Record<string,string[]> = {
      submitted:['received','rejected','cancelled'], received:['accepted','rejected','cancelled'],
      accepted:['design_review','production','rejected','cancelled'], design_review:['accepted','production','rework','rejected','cancelled'],
      production:['rework','rejected','cancelled'], rework:['design_review','production','rejected','cancelled'],
      rejected:['received','cancelled'], cancelled:[], shipped:[], delivered:[], draft:['submitted'],
    };
    if (!(transitions[row.status] || []).includes(status)) return fail(res,409,'INVALID_TRANSITION',`No se puede pasar de ${row.status} a ${status}.`);
    const label: Record<string,string> = {
      submitted:'Enviado al laboratorio',received:'Recibido por el laboratorio',accepted:'Información técnica aceptada',
      design_review:'Esperando aprobación de diseño',production:'En producción',rejected:'Rechazado',rework:'En retrabajo',cancelled:'Cancelado',
    };
    await db.transaction(async tx => {
      await tx.query('UPDATE cases SET status=$1,updated_at=now() WHERE clinic_id=$2 AND id=$3', [status,row.clinic_id,row.id]);
      await tx.query(
        `INSERT INTO case_events(id,clinic_id,case_id,actor_id,event_type,from_status,to_status)
         VALUES($1,$2,$3,$4,'status_changed',$5,$6)`,
        [randomUUID(),row.clinic_id,row.id,res.locals.user.id,row.status,status],
      );
      await tx.query(
        `INSERT INTO case_tracking_snapshots(id,clinic_id,case_id,stage,customer_label,source,updated_by)
         VALUES($1,$2,$3,$4,$5,'manual',$6)
         ON CONFLICT(clinic_id,case_id) DO UPDATE SET stage=excluded.stage,customer_label=excluded.customer_label,
         source='manual',updated_by=excluded.updated_by,updated_at=now()`,
        [randomUUID(),row.clinic_id,row.id,status,label[status] || status,res.locals.user.id],
      );
      await addIntegrationEvent(tx,'mrp','commercial_status_updated','case',row.id,{ caseId:row.id,status },`commercial_status:${row.id}:${status}:${Date.now()}`);
      await addNotification(tx,'in_app','clinic',row.clinic_id,'case_status_changed',{ caseId:row.id,status,label:label[status] },`status:${row.id}:${status}:${Date.now()}`);
      await addAudit(tx,res.locals.user.id,'case.status_changed','case',row.id,{ from:row.status,to:status });
    });
    res.json({ data: { id:row.id,status,label:label[status] } });
  }));

  app.post('/api/admin/cases/:id/tracking', authenticated, laboratory, asyncRoute(async (req, res) => {
    const row = await scopedCase(db, res.locals.user, req.params.id);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Caso no encontrado.');
    const stage = text(req.body?.stage, 120);
    const label = text(req.body?.label, 180);
    const kind = ['measured','estimated','unavailable'].includes(req.body?.progressKind) ? req.body.progressKind : 'unavailable';
    const progress = kind === 'unavailable' || req.body?.progressPercent == null ? null : Number(req.body.progressPercent);
    if (!stage || !label || (progress !== null && (!Number.isInteger(progress) || progress < 0 || progress > 100))) return fail(res, 400, 'INVALID_INPUT', 'Seguimiento inválido.');
    await db.query(
      `INSERT INTO case_tracking_snapshots(id,clinic_id,case_id,stage,customer_label,station,machine_ref,responsible_name,physical_location,
       progress_percent,progress_kind,blocked,block_reason,source,updated_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT(clinic_id,case_id) DO UPDATE SET stage=excluded.stage,customer_label=excluded.customer_label,station=excluded.station,
       machine_ref=excluded.machine_ref,responsible_name=excluded.responsible_name,physical_location=excluded.physical_location,
       progress_percent=excluded.progress_percent,progress_kind=excluded.progress_kind,blocked=excluded.blocked,block_reason=excluded.block_reason,
       source=excluded.source,updated_by=excluded.updated_by,updated_at=now()`,
      [randomUUID(),row.clinic_id,row.id,stage,label,text(req.body?.station,120)||null,text(req.body?.machineRef,120)||null,text(req.body?.responsibleName,150)||null,text(req.body?.physicalLocation,150)||null,progress,kind,Boolean(req.body?.blocked),text(req.body?.blockReason,500)||null,['manual','mrp','machine'].includes(req.body?.source)?req.body.source:'manual',res.locals.user.id],
    );
    await addNotification(db,'in_app','clinic',row.clinic_id,'tracking_updated',{ caseId:row.id,stage,label,progress },`tracking:${row.id}:${Date.now()}`);
    await addAudit(db,res.locals.user.id,'case.tracking_updated','case',row.id,{ stage,kind,progress });
    res.json({ data: { caseId:row.id,stage,label,progressPercent:progress,progressKind:kind } });
  }));

  app.post('/api/admin/cases/:id/quality-checks', authenticated, laboratory, asyncRoute(async (req, res) => {
    const row = await scopedCase(db, res.locals.user, req.params.id);
    if (!row) return fail(res, 404, 'NOT_FOUND', 'Caso no encontrado.');
    const result = req.body?.result;
    const notes = text(req.body?.notes, 5000);
    if (!['approved','rejected','rework'].includes(result)) return fail(res, 400, 'INVALID_INPUT', 'Resultado de calidad no válido.');
    const id = randomUUID();
    await db.transaction(async tx => {
      let caseItemId: string | null = null;
      if (uuid.test(req.body?.caseItemId || '')) {
        const item = await tx.query('SELECT id FROM case_items WHERE id=$1 AND clinic_id=$2 AND case_id=$3',[req.body.caseItemId,row.clinic_id,row.id]);
        if (!item.rows[0]) throw Object.assign(new Error('La pieza no pertenece al caso.'),{status:400,code:'INVALID_CASE_ITEM'});
        caseItemId = req.body.caseItemId;
      }
      await tx.query(
        `INSERT INTO quality_checks(id,clinic_id,case_id,case_item_id,result,criteria,notes,checked_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id,row.clinic_id,row.id,caseItemId,result,JSON.stringify(req.body?.criteria||{}),notes,res.locals.user.id],
      );
      if (result === 'approved') {
        await tx.query(
          `UPDATE case_tracking_snapshots SET stage='quality_approved',customer_label='Calidad aprobada · listo para logística',progress_percent=100,progress_kind='measured',blocked=false,block_reason=NULL,updated_by=$1,updated_at=now()
           WHERE clinic_id=$2 AND case_id=$3`,
          [res.locals.user.id,row.clinic_id,row.id],
        );
      } else {
        await tx.query('UPDATE cases SET status=\'rework\',updated_at=now() WHERE clinic_id=$1 AND id=$2', [row.clinic_id,row.id]);
        await tx.query(
          `UPDATE case_tracking_snapshots SET stage='quality_observation',customer_label='Observación de calidad · requiere revisión',blocked=true,block_reason=$1,updated_by=$2,updated_at=now()
           WHERE clinic_id=$3 AND case_id=$4`,
          [notes || result,res.locals.user.id,row.clinic_id,row.id],
        );
      }
      await addIntegrationEvent(tx,'mrp','quality_updated','case',row.id,{ caseId:row.id,qualityCheckId:id,result },`quality:${id}`);
      await addNotification(tx,'in_app','clinic',row.clinic_id,'quality_updated',{ caseId:row.id,result },`quality_notify:${id}`);
      await addAudit(tx,res.locals.user.id,'quality.created','quality_check',id,{ caseId:row.id,result });
    });
    res.status(201).json({ data: { id,result,notes } });
  }));

  app.get('/api/admin/payments', authenticated, laboratory, asyncRoute(async (req, res) => {
    const status = text(req.query.status, 20);
    const { rows } = await db.query(
      `SELECT p.id,p.amount,p.status,p.reference,p.evidence_note,p.created_at,p.reconciled_at,c.id AS case_id,c.reference_code,cl.name AS clinic_name
       FROM payments p JOIN orders o ON o.clinic_id=p.clinic_id AND o.id=p.order_id
       JOIN cases c ON c.clinic_id=o.clinic_id AND c.id=o.case_id JOIN clinics cl ON cl.id=c.clinic_id
       WHERE c.laboratory_id=$1 AND ($2='' OR p.status=$2) ORDER BY p.created_at DESC`,
      [res.locals.user.laboratory_id,status],
    );
    res.json({ data: rows.map((r: any) => ({ ...r,amount:money(r.amount) })) });
  }));

  app.patch('/api/admin/payments/:id', authenticated, manager, asyncRoute(async (req, res) => {
    if (!uuid.test(req.params.id) || !['confirmed','rejected'].includes(req.body?.status)) return fail(res, 400, 'INVALID_INPUT', 'Revisión de pago inválida.');
    const { rows } = await db.query(
      `UPDATE payments p SET status=$1,reviewed_by=$2,reviewed_at=now(),reconciled_at=CASE WHEN $1='confirmed' THEN now() ELSE NULL END
       FROM orders o,cases c WHERE p.id=$3 AND o.clinic_id=p.clinic_id AND o.id=p.order_id
       AND c.clinic_id=o.clinic_id AND c.id=o.case_id AND c.laboratory_id=$4
       RETURNING p.id,p.amount,p.status,c.id AS case_id,c.clinic_id`,
      [req.body.status,res.locals.user.id,req.params.id,res.locals.user.laboratory_id],
    );
    if (!rows[0]) return fail(res, 404, 'NOT_FOUND', 'Pago no encontrado.');
    await addNotification(db,'in_app','clinic',rows[0].clinic_id,'payment_reviewed',{ caseId:rows[0].case_id,paymentId:rows[0].id,status:rows[0].status },`payment_reviewed:${rows[0].id}:${rows[0].status}`);
    await addAudit(db,res.locals.user.id,'payment.reviewed','payment',rows[0].id,{ status:rows[0].status });
    res.json({ data: { ...rows[0],amount:money(rows[0].amount) } });
  }));

  // ─────────────────────────────── System 2: clients and prices
  app.get('/api/admin/clients', authenticated, manager, asyncRoute(async (_req, res) => {
    const { rows } = await db.query(
      `SELECT cl.id,cl.name,cl.tax_id,cl.email,cl.phone,cl.billing_address,cl.credit_limit,cl.payment_terms_days,cl.default_payment_mode,cl.active,
        COUNT(c.id)::int AS case_count,COALESCE(SUM(o.total),0) AS billed_total
       FROM clinic_laboratories link JOIN clinics cl ON cl.id=link.clinic_id
       LEFT JOIN cases c ON c.clinic_id=cl.id AND c.laboratory_id=link.laboratory_id
       LEFT JOIN orders o ON o.clinic_id=c.clinic_id AND o.case_id=c.id
       WHERE link.laboratory_id=$1 GROUP BY cl.id ORDER BY cl.name`,
      [res.locals.user.laboratory_id],
    );
    res.json({ data: rows.map((r: any) => ({ ...r,credit_limit:money(r.credit_limit),billed_total:money(r.billed_total) })) });
  }));

  app.patch('/api/admin/clients/:id', authenticated, manager, asyncRoute(async (req, res) => {
    if (!uuid.test(req.params.id)) return fail(res, 400, 'INVALID_INPUT', 'Cliente inválido.');
    const mode = req.body?.defaultPaymentMode;
    const credit = finite(req.body?.creditLimit);
    const terms = Number(req.body?.paymentTermsDays);
    if (!has(paymentModes, mode) || !Number.isFinite(credit) || credit < 0 || !Number.isInteger(terms) || terms < 0 || terms > 180) return fail(res, 400, 'INVALID_INPUT', 'Condiciones comerciales inválidas.');
    const { rows } = await db.query(
      `UPDATE clinics cl SET credit_limit=$1,payment_terms_days=$2,default_payment_mode=$3,active=$4
       FROM clinic_laboratories link WHERE cl.id=$5 AND link.clinic_id=cl.id AND link.laboratory_id=$6
       RETURNING cl.id,cl.name,cl.credit_limit,cl.payment_terms_days,cl.default_payment_mode,cl.active`,
      [credit,terms,mode,req.body?.active !== false,req.params.id,res.locals.user.laboratory_id],
    );
    if (!rows[0]) return fail(res, 404, 'NOT_FOUND', 'Cliente no encontrado.');
    await addAudit(db,res.locals.user.id,'client.terms_updated','clinic',rows[0].id,{ credit,terms,mode });
    res.json({ data: { ...rows[0],credit_limit:money(rows[0].credit_limit) } });
  }));

  app.get('/api/admin/price-lists', authenticated, manager, asyncRoute(async (_req, res) => {
    const { rows } = await db.query(
      `SELECT pl.id,pl.name,pl.currency,pl.active,p.id AS product_id,p.code,p.name AS product_name,pli.unit_price,pli.turnaround_days
       FROM price_lists pl LEFT JOIN price_list_items pli ON pli.price_list_id=pl.id
       LEFT JOIN catalog_products p ON p.id=pli.product_id WHERE pl.laboratory_id=$1 ORDER BY pl.name,p.name`,
      [res.locals.user.laboratory_id],
    );
    res.json({ data: rows.map((r: any) => ({ ...r,unit_price:r.unit_price==null?null:money(r.unit_price) })) });
  }));

  app.put('/api/admin/price-lists/:id/items/:productId', authenticated, manager, asyncRoute(async (req, res) => {
    if (!uuid.test(req.params.id) || !uuid.test(req.params.productId)) return fail(res, 400, 'INVALID_INPUT', 'Lista o producto inválido.');
    const price = finite(req.body?.unitPrice);
    const turnaround = Number(req.body?.turnaroundDays);
    if (!Number.isFinite(price) || price < 0 || !Number.isInteger(turnaround) || turnaround < 1 || turnaround > 120) return fail(res, 400, 'INVALID_INPUT', 'Precio o plazo inválido.');
    const owned = await db.query('SELECT id FROM price_lists WHERE id=$1 AND laboratory_id=$2', [req.params.id,res.locals.user.laboratory_id]);
    if (!owned.rows[0]) return fail(res, 404, 'NOT_FOUND', 'Lista de precios no encontrada.');
    await db.query(
      `INSERT INTO price_list_items(price_list_id,product_id,unit_price,turnaround_days) VALUES($1,$2,$3,$4)
       ON CONFLICT(price_list_id,product_id) DO UPDATE SET unit_price=excluded.unit_price,turnaround_days=excluded.turnaround_days`,
      [req.params.id,req.params.productId,price,turnaround],
    );
    await addAudit(db,res.locals.user.id,'price.updated','price_list',req.params.id,{ productId:req.params.productId,price,turnaround });
    res.json({ data: { priceListId:req.params.id,productId:req.params.productId,unitPrice:price,turnaroundDays:turnaround } });
  }));

  // ─────────────────────────────── System 2: inventory, suppliers and purchases
}
