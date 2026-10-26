import type { Express, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db.js';
import { addAudit, addIntegrationEvent, addNotification, asyncRoute, caseStatuses, dateOnly, fail, finite, has, money, movementTypes, scopedCase, text, uuid } from '../support.js';

export function registerLogisticsIntegrationRoutes(app: Express, db: Database, middleware: { authenticated: RequestHandler; laboratory: RequestHandler; manager: RequestHandler }) {
  const { authenticated, laboratory, manager } = middleware;
  app.get('/api/admin/shipments', authenticated, laboratory, asyncRoute(async (_req,res)=>{
    const {rows}=await db.query(
      `SELECT s.*,c.reference_code,cl.name AS clinic_name FROM shipments s
       JOIN cases c ON c.clinic_id=s.clinic_id AND c.id=s.case_id JOIN clinics cl ON cl.id=c.clinic_id
       WHERE c.laboratory_id=$1 ORDER BY s.created_at DESC`,
      [res.locals.user.laboratory_id],
    );
    res.json({data:rows});
  }));

  app.post('/api/admin/shipments', authenticated, laboratory, asyncRoute(async (req,res)=>{
    const caseId=req.body?.caseId;
    if(!uuid.test(caseId))return fail(res,400,'INVALID_INPUT','Caso inválido.');
    const row=await scopedCase(db,res.locals.user,caseId);
    if(!row)return fail(res,404,'NOT_FOUND','Caso no encontrado.');
    const approved=await db.query('SELECT id FROM quality_checks WHERE clinic_id=$1 AND case_id=$2 AND result=\'approved\' ORDER BY checked_at DESC LIMIT 1',[row.clinic_id,row.id]);
    if(!approved.rows[0])return fail(res,409,'QUALITY_REQUIRED','Se requiere calidad aprobada antes de preparar el envío.');
    const carrier=text(req.body?.carrier,120);const address=text(req.body?.deliveryAddress,500)||row.shipping_address;
    if(carrier.length<2||!address)return fail(res,400,'INVALID_INPUT','Transportista y dirección son obligatorios.');
    const balance=Math.max(0,money(row.total)-money(row.paid_amount));
    const instruction=row.payment_mode==='monthly_invoice'||balance<=0?'none':row.payment_mode==='pay_on_delivery'?'collect_total':'collect_balance';
    const id=randomUUID();
    await db.transaction(async tx=>{
      await tx.query(
        `INSERT INTO shipments(id,clinic_id,case_id,carrier,service,delivery_address,collection_instruction,scheduled_at,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id,row.clinic_id,row.id,carrier,text(req.body?.service,80)||'regular',address,instruction,req.body?.scheduledAt||null,res.locals.user.id],
      );
      const items=await tx.query('SELECT id,quantity FROM case_items WHERE clinic_id=$1 AND case_id=$2',[row.clinic_id,row.id]);
      for(const item of items.rows as any[])await tx.query('INSERT INTO shipment_items(shipment_id,case_item_id,quantity) VALUES($1,$2,$3)',[id,item.id,item.quantity]);
      await addNotification(tx,'in_app','clinic',row.clinic_id,'shipment_prepared',{caseId:row.id,shipmentId:id,instruction},`shipment_prepared:${id}`);
      await addAudit(tx,res.locals.user.id,'shipment.created','shipment',id,{caseId:row.id,instruction});
    });
    res.status(201).json({data:{id,caseId:row.id,status:'prepared',carrier,deliveryAddress:address,collectionInstruction:instruction}});
  }));

  app.patch('/api/admin/shipments/:id', authenticated, laboratory, asyncRoute(async (req,res)=>{
    if(!uuid.test(req.params.id)||!['scheduled','dispatched','delivered','incident','cancelled'].includes(req.body?.status))return fail(res,400,'INVALID_INPUT','Estado de envío inválido.');
    const status=req.body.status;
    const {rows}=await db.query(
      `UPDATE shipments s SET status=$1,tracking_code=COALESCE($2,tracking_code),
       dispatched_at=CASE WHEN $1='dispatched' THEN now() ELSE dispatched_at END,
       delivered_at=CASE WHEN $1='delivered' THEN now() ELSE delivered_at END,
       received_by_name=CASE WHEN $1='delivered' THEN $3 ELSE received_by_name END
       FROM cases c WHERE s.id=$4 AND c.clinic_id=s.clinic_id AND c.id=s.case_id AND c.laboratory_id=$5
       RETURNING s.id,s.clinic_id,s.case_id,s.status,s.tracking_code,s.delivered_at`,
      [status,text(req.body?.trackingCode,120)||null,text(req.body?.receivedByName,150)||null,req.params.id,res.locals.user.laboratory_id],
    );
    if(!rows[0])return fail(res,404,'NOT_FOUND','Envío no encontrado.');
    if(status==='dispatched')await db.query('UPDATE cases SET status=\'shipped\',updated_at=now() WHERE clinic_id=$1 AND id=$2',[rows[0].clinic_id,rows[0].case_id]);
    if(status==='delivered')await db.query('UPDATE cases SET status=\'delivered\',completed_at=now(),updated_at=now() WHERE clinic_id=$1 AND id=$2',[rows[0].clinic_id,rows[0].case_id]);
    await addNotification(db,'in_app','clinic',rows[0].clinic_id,'shipment_status_changed',{caseId:rows[0].case_id,shipmentId:rows[0].id,status},`shipment_status:${rows[0].id}:${status}`);
    await addIntegrationEvent(db,'mrp','shipment_status_changed','shipment',rows[0].id,{caseId:rows[0].case_id,status},`shipment_status_mrp:${rows[0].id}:${status}`);
    await addAudit(db,res.locals.user.id,'shipment.status_changed','shipment',rows[0].id,{status});
    res.json({data:rows[0]});
  }));

  app.get('/api/admin/invoices', authenticated, laboratory, asyncRoute(async (_req,res)=>{
    const {rows}=await db.query(
      `SELECT i.*,cl.name AS clinic_name FROM invoices i JOIN clinics cl ON cl.id=i.clinic_id
       JOIN clinic_laboratories link ON link.clinic_id=i.clinic_id WHERE link.laboratory_id=$1 ORDER BY i.issue_date DESC,i.created_at DESC`,
      [res.locals.user.laboratory_id],
    );
    res.json({data:rows.map((r:any)=>({...r,total:money(r.total),paid_amount:money(r.paid_amount)}))});
  }));

  app.post('/api/admin/invoices', authenticated, manager, asyncRoute(async (req,res)=>{
    const caseId=req.body?.caseId;
    if(!uuid.test(caseId)||!dateOnly(req.body?.dueDate))return fail(res,400,'INVALID_INPUT','Caso o vencimiento inválido.');
    const row=await scopedCase(db,res.locals.user,caseId);
    if(!row?.order_id)return fail(res,404,'NOT_FOUND','Caso u orden no encontrados.');
    if(row.status!=='delivered')return fail(res,409,'DELIVERY_REQUIRED','La factura del piloto se emite después de la entrega confirmada.');
    const id=randomUUID();const number=text(req.body?.invoiceNumber,80)||`F-PILOTO-${id.slice(0,8).toUpperCase()}`;
    await db.transaction(async tx=>{
      await tx.query(
        `INSERT INTO invoices(id,clinic_id,invoice_number,due_date,total) VALUES($1,$2,$3,$4,$5)`,
        [id,row.clinic_id,number,req.body.dueDate,row.total],
      );
      await tx.query(
        `INSERT INTO invoice_items(id,invoice_id,clinic_id,case_id,description,amount) VALUES($1,$2,$3,$4,$5,$6)`,
        [randomUUID(),id,row.clinic_id,row.id,`Caso ${row.reference_code}: ${row.title}`,row.total],
      );
      await addNotification(tx,'in_app','clinic',row.clinic_id,'invoice_issued',{caseId:row.id,invoiceId:id,invoiceNumber:number,total:money(row.total)},`invoice:${id}`);
      await addAudit(tx,res.locals.user.id,'invoice.created','invoice',id,{caseId:row.id,number});
    });
    res.status(201).json({data:{id,invoiceNumber:number,dueDate:req.body.dueDate,total:money(row.total),status:'pending'}});
  }));

  // Integration queue for the future MRP/PANDA/WhatsApp adapters. It does not pretend the adapter already exists.
  app.get('/api/admin/integrations/outbox', authenticated, manager, asyncRoute(async (req,res)=>{
    const destination=['mrp','panda','storage','billing'].includes(String(req.query.destination))?String(req.query.destination):'mrp';
    const status=['pending','processing','sent','failed','cancelled'].includes(String(req.query.status))?String(req.query.status):'pending';
    const {rows}=await db.query(
      `SELECT id,destination,event_type,aggregate_type,aggregate_id,payload,status,attempts,next_attempt_at,last_error,created_at
       FROM integration_outbox WHERE destination=$1 AND status=$2 ORDER BY created_at LIMIT 100`,
      [destination,status],
    );
    res.json({data:rows});
  }));

  app.patch('/api/admin/integrations/outbox/:id', authenticated, manager, asyncRoute(async (req,res)=>{
    if(!uuid.test(req.params.id)||!['processing','sent','failed','cancelled'].includes(req.body?.status))return fail(res,400,'INVALID_INPUT','Actualización de integración inválida.');
    const {rows}=await db.query(
      `UPDATE integration_outbox SET status=$1,attempts=attempts+CASE WHEN $1 IN ('processing','failed') THEN 1 ELSE 0 END,
       last_error=$2,next_attempt_at=CASE WHEN $1='failed' THEN now()+interval '5 minutes' ELSE next_attempt_at END
       WHERE id=$3 RETURNING *`,
      [req.body.status,text(req.body?.lastError,1000)||null,req.params.id],
    );
    if(!rows[0])return fail(res,404,'NOT_FOUND','Evento no encontrado.');
    res.json({data:rows[0]});
  }));
}
