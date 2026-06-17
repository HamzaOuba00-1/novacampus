/**
 * types/index.ts
 * ---------------------------------------------------------------
 * Interfaces et types TypeScript partagés dans tout le service
 * paiements. Couvre factures, relances, méthodes de paiement
 * et structures de reporting financier.
 * ---------------------------------------------------------------
 */

import { Request } from 'express';

// ---------------------------------------------------------------
// Auth – identiques aux autres services
// ---------------------------------------------------------------
export type UserRole = 'student' | 'instructor' | 'admin' | 'direction';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  campusId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ---------------------------------------------------------------
// Format de réponse normalisé
// ---------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  status: 'success' | 'failure' | 'pending';
  data?: T;
  message?: string;
  code?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------
// Statuts d'une facture
// ---------------------------------------------------------------
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

// ---------------------------------------------------------------
// Méthodes de paiement acceptées
// ---------------------------------------------------------------
export type PaymentMethod = 'transfer' | 'card' | 'check' | 'cash' | 'other';

// ---------------------------------------------------------------
// Canal d'envoi d'une relance
// ---------------------------------------------------------------
export type ReminderChannel = 'email' | 'sms' | 'letter';

// ---------------------------------------------------------------
// Déclencheur d'une relance (manuelle, IA ou planifiée)
// ---------------------------------------------------------------
export type ReminderTrigger = 'manual' | 'ai_agent' | 'scheduled';

// ---------------------------------------------------------------
// Structure d'un rapport financier agrégé
// ---------------------------------------------------------------
export interface FinancialStats {
  campusId: string | null;
  academicYear: number | null;
  totalInvoiced: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;    // % recouvrement
  overdueRate: number;       // % retard
  invoiceCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}
