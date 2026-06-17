/**
 * types/index.ts
 * ---------------------------------------------------------------
 * Interfaces et types TypeScript partagés dans tout le service
 * académique. Centraliser ici garantit la cohérence entre
 * les couches model, service et controller.
 * ---------------------------------------------------------------
 */

import { Request } from 'express';

// ---------------------------------------------------------------
// Rôles utilisateur – identiques à ceux de l'auth-service
// Le service académique lit ces rôles depuis le JWT décodé
// ---------------------------------------------------------------
export type UserRole = 'student' | 'instructor' | 'admin' | 'direction';

// ---------------------------------------------------------------
// Payload JWT décodé – émis par l'auth-service
// Attaché à req.user après passage par le middleware authenticate
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
// Format de réponse normalisé – identique à l'auth-service
// Toutes les réponses API suivent ce contrat
// ---------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  status: 'success' | 'failure' | 'pending';
  data?: T;
  message?: string;
  code?: string;
  meta?: PaginationMeta;
}

// ---------------------------------------------------------------
// Métadonnées de pagination pour les listes
// ---------------------------------------------------------------
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------
// Options de pagination communes à tous les endpoints de liste
// ---------------------------------------------------------------
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------
// Types ENUM reflétant les valeurs en base de données
// ---------------------------------------------------------------
export type ProgramType = 'bachelor' | 'master' | 'other';
export type CourseStatus = 'active' | 'archived';
export type EnrollmentStatus = 'enrolled' | 'validated' | 'failed' | 'withdrawn';
export type AbsenceType = 'absent' | 'late' | 'justified';
export type DeadlineType = 'homework' | 'project' | 'exam' | 'other';
export type ResourceType = 'pdf' | 'video' | 'link' | 'other';
export type AcademicRecordResult = 'validated' | 'failed' | 'deferred';
export type InstructorRole = 'lead' | 'assistant' | 'substitute';
