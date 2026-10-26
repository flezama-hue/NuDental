import { createHash, randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Queryable } from './db.js';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const sha256 = /^[a-f0-9]{64}$/i;
export const cookieName = 'nudental_session';
export const legacyCookieName = 'k2_session';
export const sessionLife = 8 * 60 * 60 * 1000;
export const caseStatuses = ['draft','submitted','received','accepted','design_review','production','shipped','delivered','rejected','rework','cancelled'] as const;
export const paymentModes = ['advance_balance','pay_on_delivery','monthly_invoice'] as const;
export const messageTypes = ['text','system','approval','quality','logistics','technical_query'] as const;
export const movementTypes = ['entry','exit','adjustment_in','adjustment_out','reservation','release','consumption','return'] as const;

export const asyncRoute = (fn: (...args: any[]) => Promise<any>): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
export const fail = (res: any, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
export const text = (value: unknown, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : Number(value);
export const dateOnly = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
export const publicUser = (u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, clinicId: u.clinic_id, laboratoryId: u.laboratory_id });
export const publicPatient = (p: any) => ({ id: p.id, name: p.name, birthDate: p.birth_date, gender: p.gender, internalId: p.internal_id });
export const money = (value: unknown) => Number(value || 0);
export const has = <T extends readonly string[]>(values: T, value: unknown): value is T[number] => typeof value === 'string' && values.includes(value as T[number]);

export function rawCookie(req: any) {
  const values = String(req.headers.cookie || '').split(';').map((s: string) => s.trim());
  for (const name of [cookieName, legacyCookieName]) {
    const raw = values.find((s: string) => s.startsWith(name + '='))?.slice(name.length + 1);
    if (raw && /^[a-f0-9]{64}$/.test(raw)) return raw;
  }
  return null;
}

export function publicCase(row: any) {
  const total = money(row.total);
  const paid = money(row.paid_amount);
  return {
    id: row.id,
    code: row.reference_code,
    clientReference: row.client_reference,
    title: row.title,
    instructions: row.instructions,
    status: row.status,
    urgency: row.urgency,
    dueDate: row.due_date,
    source: row.submission_source,
    shippingAddress: row.shipping_address,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    patient: row.patient_id ? { id: row.patient_id, name: row.patient_name, internalId: row.patient_internal_id } : null,
    order: row.order_id ? {
      id: row.order_id,
      total,
      paidAmount: paid,
      balance: Math.max(0, total - paid),
      paymentMode: row.payment_mode,
      depositAmount: money(row.deposit_amount),
      status: row.order_status,
    } : null,
    tracking: row.tracking_id ? {
      stage: row.stage,
      label: row.customer_label,
      progressPercent: row.progress_percent == null ? null : Number(row.progress_percent),
      progressKind: row.progress_kind,
      blocked: row.blocked,
      blockReason: row.block_reason,
      responsibleName: row.responsible_name,
      updatedAt: row.tracking_updated_at,
    } : null,
  };
}

export function caseListSql(where: string) {
  return `
    SELECT c.*, p.name AS patient_name, p.internal_id AS patient_internal_id,
      o.id AS order_id, o.total, o.payment_mode, o.deposit_amount, o.status AS order_status,
      COALESCE((SELECT SUM(pay.amount) FROM payments pay WHERE pay.clinic_id=c.clinic_id AND pay.order_id=o.id AND pay.status='confirmed'),0) AS paid_amount,
      t.id AS tracking_id, t.stage, t.customer_label, t.progress_percent, t.progress_kind,
      t.blocked, t.block_reason, t.responsible_name, t.updated_at AS tracking_updated_at
    FROM cases c
    JOIN patients p ON p.clinic_id=c.clinic_id AND p.id=c.patient_id
    LEFT JOIN orders o ON o.clinic_id=c.clinic_id AND o.case_id=c.id
    LEFT JOIN case_tracking_snapshots t ON t.clinic_id=c.clinic_id AND t.case_id=c.id
    WHERE ${where}`;
}

export async function scopedCase(db: Queryable, user: any, id: string) {
  if (!uuid.test(id)) return null;
  const clinical = Boolean(user.clinic_id);
  const condition = clinical ? 'c.clinic_id=$1 AND c.id=$2' : 'c.laboratory_id=$1 AND c.id=$2';
  const scope = clinical ? user.clinic_id : user.laboratory_id;
  const { rows } = await db.query(caseListSql(condition), [scope, id]);
  return rows[0] || null;
}

export async function addAudit(db: Queryable, actorId: string, action: string, entityType: string, entityId: string | null, metadata: unknown = {}) {
  await db.query(
    'INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',
    [randomUUID(), actorId, action, entityType, entityId, JSON.stringify(metadata)],
  );
}

export async function addIntegrationEvent(db: Queryable, destination: string, eventType: string, aggregateType: string, aggregateId: string, payload: unknown, key?: string) {
  const id = randomUUID();
  await db.query(
    `INSERT INTO integration_outbox(id,destination,event_type,aggregate_type,aggregate_id,payload,idempotency_key)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [id, destination, eventType, aggregateType, aggregateId, JSON.stringify(payload), key || `${eventType}:${aggregateId}:${id}`],
  );
}

export async function addNotification(db: Queryable, channel: 'in_app' | 'email' | 'whatsapp', recipientType: string, recipientId: string, template: string, payload: unknown, key: string) {
  await db.query(
    `INSERT INTO notification_outbox(id,channel,recipient_type,recipient_id,template_key,payload,idempotency_key)
     VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(idempotency_key) DO NOTHING`,
    [randomUUID(), channel, recipientType, recipientId, template, JSON.stringify(payload), key],
  );
}
