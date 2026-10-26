import type { Express, RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import type { Database } from '../db.js';
import { addAudit, addIntegrationEvent, addNotification, asyncRoute, caseStatuses, dateOnly, fail, finite, has, money, movementTypes, scopedCase, text, uuid } from '../support.js';

export function registerInventoryPurchasesRoutes(app: Express, db: Database, middleware: { authenticated: RequestHandler; laboratory: RequestHandler; manager: RequestHandler }) {
  const { authenticated, laboratory, manager } = middleware;
  app.get('/api/admin/inventory', authenticated, laboratory, asyncRoute(async (_req, res) => {
    const { rows } = await db.query(
      `SELECT id,sku,name,category,unit,current_stock,reserved_stock,minimum_stock,lot_tracking,active,
       (current_stock-reserved_stock) AS available_stock
       FROM inventory_items WHERE laboratory_id=$1 ORDER BY active DESC,name`,
      [res.locals.user.laboratory_id],
    );
    res.json({ data: rows.map((r: any) => ({ ...r,current_stock:Number(r.current_stock),reserved_stock:Number(r.reserved_stock),minimum_stock:Number(r.minimum_stock),available_stock:Number(r.available_stock) })) });
  }));

  app.post('/api/admin/inventory', authenticated, manager, asyncRoute(async (req, res) => {
    const sku = text(req.body?.sku,60).toUpperCase();
    const name = text(req.body?.name,180);
    const unit = text(req.body?.unit,30);
    const minimum = finite(req.body?.minimumStock);
    if (!sku || name.length<2 || !unit || !Number.isFinite(minimum) || minimum<0) return fail(res,400,'INVALID_INPUT','Datos del material inválidos.');
    const id=randomUUID();
    const { rows }=await db.query(
      `INSERT INTO inventory_items(id,laboratory_id,sku,name,category,unit,minimum_stock,lot_tracking)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id,res.locals.user.laboratory_id,sku,name,text(req.body?.category,80)||'Material',unit,minimum,Boolean(req.body?.lotTracking)],
    );
    await addAudit(db,res.locals.user.id,'inventory.item_created','inventory_item',id);
    res.status(201).json({data:rows[0]});
  }));

  app.post('/api/admin/inventory/:id/movements', authenticated, laboratory, asyncRoute(async (req, res) => {
    if (!uuid.test(req.params.id) || !has(movementTypes, req.body?.movementType)) return fail(res,400,'INVALID_INPUT','Movimiento inválido.');
    const quantity=finite(req.body?.quantity);
    if (!Number.isFinite(quantity)||quantity<=0) return fail(res,400,'INVALID_INPUT','La cantidad debe ser positiva.');
    const result=await db.transaction(async tx=>{
      const found=await tx.query('SELECT * FROM inventory_items WHERE id=$1 AND laboratory_id=$2 AND active=true FOR UPDATE',[req.params.id,res.locals.user.laboratory_id]);
      const item:any=found.rows[0];
      if(!item) return {error:[404,'NOT_FOUND','Material no encontrado.'] as const};
      let current=Number(item.current_stock); let reserved=Number(item.reserved_stock);
      const type=req.body.movementType;
      if(['entry','adjustment_in','return'].includes(type)) current+=quantity;
      if(['exit','adjustment_out'].includes(type)) current-=quantity;
      if(type==='reservation') reserved+=quantity;
      if(type==='release') reserved-=quantity;
      if(type==='consumption'){current-=quantity;reserved=Math.max(0,reserved-quantity);}
      if(current<0||reserved<0||reserved>current) return {error:[409,'INSUFFICIENT_STOCK','El movimiento dejaría existencias o reservas inválidas.'] as const};
      await tx.query('UPDATE inventory_items SET current_stock=$1,reserved_stock=$2 WHERE id=$3',[current,reserved,item.id]);
      const id=randomUUID();
      await tx.query(
        `INSERT INTO inventory_movements(id,inventory_item_id,movement_type,quantity,reference_type,reference_id,notes,created_by)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id,item.id,type,quantity,text(req.body?.referenceType,60)||null,uuid.test(req.body?.referenceId||'')?req.body.referenceId:null,text(req.body?.notes,1000),res.locals.user.id],
      );
      await addAudit(tx,res.locals.user.id,'inventory.movement_created','inventory_movement',id,{itemId:item.id,type,quantity});
      return {id,currentStock:current,reservedStock:reserved,availableStock:current-reserved};
    });
    if('error'in result)return fail(res,result.error[0],result.error[1],result.error[2]);
    res.status(201).json({data:result});
  }));

  app.get('/api/admin/suppliers', authenticated, laboratory, asyncRoute(async (_req,res)=>{
    const {rows}=await db.query('SELECT * FROM suppliers WHERE laboratory_id=$1 ORDER BY active DESC,name',[res.locals.user.laboratory_id]);
    res.json({data:rows});
  }));

  app.post('/api/admin/suppliers', authenticated, manager, asyncRoute(async (req,res)=>{
    const name=text(req.body?.name,160); const lead=Number(req.body?.leadTimeDays??7);
    if(name.length<2||!Number.isInteger(lead)||lead<0||lead>365)return fail(res,400,'INVALID_INPUT','Datos del proveedor inválidos.');
    const id=randomUUID();
    const {rows}=await db.query(
      `INSERT INTO suppliers(id,laboratory_id,name,tax_id,contact_name,email,phone,lead_time_days)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id,res.locals.user.laboratory_id,name,text(req.body?.taxId,30)||null,text(req.body?.contactName,150)||null,text(req.body?.email,254)||null,text(req.body?.phone,50)||null,lead],
    );
    await addAudit(db,res.locals.user.id,'supplier.created','supplier',id);
    res.status(201).json({data:rows[0]});
  }));

  app.get('/api/admin/purchase-orders', authenticated, laboratory, asyncRoute(async (_req,res)=>{
    const {rows}=await db.query(
      `SELECT po.id,po.order_number,po.status,po.currency,po.total,po.expected_at,po.created_at,s.name AS supplier_name,
       COALESCE((SELECT COUNT(*) FROM purchase_order_items i WHERE i.purchase_order_id=po.id),0)::int AS item_count
       FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id WHERE po.laboratory_id=$1 ORDER BY po.created_at DESC`,
      [res.locals.user.laboratory_id],
    );
    res.json({data:rows.map((r:any)=>({...r,total:money(r.total)}))});
  }));

  app.post('/api/admin/purchase-orders', authenticated, manager, asyncRoute(async (req,res)=>{
    const supplierId=req.body?.supplierId; const items=Array.isArray(req.body?.items)?req.body.items:[];
    if(!uuid.test(supplierId)||items.length<1||items.length>100)return fail(res,400,'INVALID_INPUT','Proveedor o líneas de compra inválidas.');
    const result=await db.transaction(async tx=>{
      const supplier=await tx.query('SELECT id FROM suppliers WHERE id=$1 AND laboratory_id=$2 AND active=true',[supplierId,res.locals.user.laboratory_id]);
      if(!supplier.rows[0])return {error:[404,'NOT_FOUND','Proveedor no encontrado.'] as const};
      let total=0; const normalized:any[]=[];
      for(const line of items){
        if(!uuid.test(line.inventoryItemId))return {error:[400,'INVALID_INPUT','Material inválido en una línea.'] as const};
        const quantity=finite(line.quantity);const unitCost=finite(line.unitCost);
        if(!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unitCost)||unitCost<0)return {error:[400,'INVALID_INPUT','Cantidad o costo inválido.'] as const};
        const item=await tx.query('SELECT id FROM inventory_items WHERE id=$1 AND laboratory_id=$2 AND active=true',[line.inventoryItemId,res.locals.user.laboratory_id]);
        if(!item.rows[0])return {error:[404,'NOT_FOUND','Un material no pertenece al laboratorio.'] as const};
        total+=quantity*unitCost;normalized.push({inventoryItemId:line.inventoryItemId,quantity,unitCost});
      }
      total=Math.round(total*100)/100; const id=randomUUID();
      const orderNumber=text(req.body?.orderNumber,80)||`OC-${new Date().getFullYear()}-${id.slice(0,6).toUpperCase()}`;
      await tx.query(
        `INSERT INTO purchase_orders(id,laboratory_id,supplier_id,order_number,status,total,expected_at,approved_by,created_by)
         VALUES($1,$2,$3,$4,'sent',$5,$6,$7,$7)`,
        [id,res.locals.user.laboratory_id,supplierId,orderNumber,total,dateOnly(req.body?.expectedAt)?req.body.expectedAt:null,res.locals.user.id],
      );
      for(const line of normalized)await tx.query(
        `INSERT INTO purchase_order_items(id,purchase_order_id,inventory_item_id,quantity,unit_cost) VALUES($1,$2,$3,$4,$5)`,
        [randomUUID(),id,line.inventoryItemId,line.quantity,line.unitCost],
      );
      await addAudit(tx,res.locals.user.id,'purchase_order.created','purchase_order',id,{orderNumber,total});
      return{id,orderNumber,total,status:'sent'};
    });
    if('error'in result)return fail(res,result.error[0],result.error[1],result.error[2]);
    res.status(201).json({data:result});
  }));

  // ─────────────────────────────── System 2: logistics and invoicing
}
