/**
 * types/index.ts
 * ---------------------------------------------------------------
 * Interfaces et types TypeScript partagés dans tout le service
 * d'inscriptions. Couvre les profils étudiants, enseignants,
 * documents justificatifs et statuts associés.
 * ---------------------------------------------------------------
 */

import { Request } from 'express';

// ---------------------------------------------------------------
// Rôles utilisateur – identiques à ceux de l'auth-service
// ---------------------------------------------------------------
export type UserRole = 'student' | 'instructor' | 'admin' | 'direction';

// ---------------------------------------------------------------
// Payload JWT décodé – émis par l'auth-service
// ---------------------------------------------------------------
export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  campusId?: string;
}

// ---------------------------------------------------------------
// Extension de Request Express avec l'utilisateur authentifié
// ---------------------------------------------------------------
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
// Statuts étudiant
// ---------------------------------------------------------------
export type StudentStatus =
  | 'active'
  | 'suspended'
  | 'graduated'
  | 'withdrawn';

// ---------------------------------------------------------------
// Statut de paiement (dupliqué depuis payments-service pour
// affichage dans le dossier étudiant sans appel cross-service)
// ---------------------------------------------------------------
export type PaymentStatus = 'up_to_date' | 'pending' | 'overdue';

// ---------------------------------------------------------------
// Type de document justificatif
// ---------------------------------------------------------------
export type DocumentType =
  | 'id_card'
  | 'diploma'
  | 'photo'
  | 'proof_of_address'
  | 'health_certificate'
  | 'other';

// ---------------------------------------------------------------
// Type de contrat enseignant
// ---------------------------------------------------------------
export type ContractType = 'permanent' | 'visiting' | 'freelance';

// ---------------------------------------------------------------
// Statut de vérification d'un document
// ---------------------------------------------------------------
export type DocumentVerificationStatus = 'pending' | 'verified' | 'rejected';
