/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CaseStatus =
  | 'Borrador'
  | 'Enviado'
  | 'Recibido'
  | 'Aceptado'
  | 'Aprobación de diseño'
  | 'En producción'
  | 'En camino'
  | 'Entregado'
  | 'Rechazado'
  | 'Re-trabajo'
  | 'Cancelado';

// Doctor sign-off on the lab's 3D design before it goes to production.
export interface DesignApproval {
  sentDate: string;
  modelLabel?: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  doctorComment?: string;
}

export type UrgencyType = 'estandar' | 'express';

// Payment lifecycle: pending → (doctor marks paid) → validating (system checks
// the incoming deposit) → paid (confirmed) or back to pending if not found.
export type PaymentStatus = 'pendiente' | 'en_validacion' | 'pagado';

export interface ScanFile {
  name: string;
  size: string;
  date: string;
  type: 'stl' | 'ply' | 'obj' | 'photo';
}

export interface AIScanReview {
  completeScan: boolean;
  underCutWarning: boolean;
  occlusalSpace: boolean;
  marginWarning: boolean;
}

export interface CaseRating {
  score: number;
  comment?: string;
  reqRemake?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'doctor' | 'lab';
  text: string;
  time: string;
  image?: string;
}

export interface VideoCallSession {
  id: string;
  caseId?: string;
  caseName?: string;
  date: string;
  duration: string;
  technician: string;
  notes: string;
  snapshots: string[];
}

export interface Case {
  id: string;
  patientId: string;
  patientName: string;
  caseName: string;
  sentDate: string;
  deliveryDate: string;
  status: CaseStatus;
  urgency: UrgencyType;
  teeth: number[];
  isBridge: boolean;
  product: string;
  price?: number; // Price in PEN (S/)
  paymentStatus?: PaymentStatus;
  material: string;
  shade: string;
  instructions: string;
  files: ScanFile[];
  aiReview: AIScanReview;
  rating: CaseRating | null;
  designApproval?: DesignApproval;
  chat: ChatMessage[];
  priorCalls: VideoCallSession[];
  remakeForm?: {
    reason: string;
    description: string;
    attachedFiles: string[];
  };
  // New-order metadata (multi-step order flow)
  category?: string;            // e.g. "Restauraciones Fijas"
  restorationType?: string;     // e.g. "Corona", "Carilla", "Puente"
  extras?: string[];            // Model, Night Guard, etc.
  rxInstructions?: Record<string, string>; // Contactos, Holgura, Estética…
  requestingDoctor?: string;
  shippingAddress?: string;
  preApproveDesign?: boolean;   // doctor opted into 24h design pre-approval
}

export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  gender: 'Masculino' | 'Femenino' | 'Otro';
  internalId: string;
  lastCaseId?: string;
}

export interface Technician {
  id: string;
  name: string;
  specialty: 'Prótesis Fija' | 'Implantología' | 'Estética Dental' | 'Ortodoncia';
  avatarColor: string;
  online: boolean;
}

export interface AppNotification {
  id: string;
  text: string;
  caseId?: string;
  time: string;
  read: boolean;
}
