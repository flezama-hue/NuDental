export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'clinic_admin' | 'dentist' | 'lab_manager' | 'lab_technician';
  clinicId: string | null;
  laboratoryId: string | null;
}

export interface StoredPatient { id: string; name: string; birthDate: string; gender: string; internalId: string; }
export interface CatalogProduct {
  id: string; code: string; name: string; category: string; default_material: string | null;
  turnaround_days: number; requires_design_approval: boolean; unit_price: number;
}
export interface TrackingSummary {
  stage: string; label: string; progressPercent: number | null; progressKind: 'measured' | 'estimated' | 'unavailable';
  blocked: boolean; blockReason: string | null; responsibleName: string | null; updatedAt: string;
}
export interface CaseSummary {
  id: string; code: string; clientReference: string | null; title: string; instructions: string; status: string;
  urgency: 'standard' | 'express'; dueDate: string | null; source: string; shippingAddress: string; revision: number; createdAt: string;
  updatedAt: string; lastMessageAt: string | null;
  patient: { id: string; name: string; internalId: string } | null;
  order: null | { id: string; total: number; paidAmount: number; balance: number; paymentMode: string; depositAmount: number; status: string };
  tracking: TrackingSummary | null;
}
export interface CaseDetail extends CaseSummary {
  items: Array<Record<string, any>>;
  files: Array<Record<string, any>>;
  designs: Array<Record<string, any>>;
  messages: Array<Record<string, any>>;
  payments: Array<Record<string, any>>;
  shipments: Array<Record<string, any>>;
  qualityChecks: Array<Record<string, any>>;
  assignments: Array<Record<string, any>>;
}
export interface DashboardData {
  roleView: 'clinical' | 'administrative'; statusCounts: Record<string, number>;
  totalAmount?: number; paidAmount?: number; unreadMessages?: number;
  lowStockItems?: number; activeShipments?: number; paymentsToReview?: number;
}
export interface InventoryItem {
  id: string; sku: string; name: string; category: string; unit: string;
  current_stock: number; reserved_stock: number; minimum_stock: number; available_stock: number;
  lot_tracking: boolean; active: boolean;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch('/api' + path, {
    ...options,
    credentials: 'same-origin',
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error?.message || 'No se pudo completar la solicitud.', response.status, data.error?.code);
  return data as T;
}

export const money = (value: number | string | null | undefined) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value || 0));
export const shortDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(value)) : 'Sin fecha';
export const statusLabel: Record<string, string> = {
  draft: 'Borrador', submitted: 'Enviado', received: 'Recibido', accepted: 'Aceptado', design_review: 'Revisión de diseño',
  production: 'Producción', shipped: 'Despachado', delivered: 'Entregado', rejected: 'Rechazado', rework: 'Retrabajo', cancelled: 'Cancelado',
};
