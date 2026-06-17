/**
 * types/index.ts
 * ---------------------------------------------------------------
 * Interfaces et types TypeScript partagés dans tout le service
 * Campus / Admin. Couvre les entités campus, années académiques,
 * audit log et configuration globale.
 * ---------------------------------------------------------------
 */

import { Request } from 'express';

// ---------------------------------------------------------------
// Auth
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
// Statuts d'un campus
// ---------------------------------------------------------------
export type CampusStatus = 'active' | 'inactive' | 'archived';

// ---------------------------------------------------------------
// Résultat d'une année académique (décision jury)
// ---------------------------------------------------------------
export type AcademicYearResult = 'validated' | 'failed' | 'deferred';

// ---------------------------------------------------------------
// Actions tracées dans l'audit log
// Format : "<entité>.<action>"
// ---------------------------------------------------------------
export type AuditAction =
  | 'campus.create' | 'campus.update' | 'campus.archive'
  | 'academic_year.create' | 'academic_year.update' | 'academic_year.set_current'
  | 'user.create' | 'user.update' | 'user.activate' | 'user.deactivate'
  | 'student.create' | 'student.update' | 'student.status_change'
  | 'grade.create' | 'grade.update' | 'grade.delete'
  | 'invoice.create' | 'invoice.pay' | 'invoice.cancel'
  | 'document.verify' | 'document.reject'
  | 'schedule.create' | 'schedule.update' | 'schedule.cancel'
  | 'room.create' | 'room.update'
  | 'config.update'
  | string; // Permet des actions personnalisées depuis d'autres services

// ---------------------------------------------------------------
// Structure d'une entrée d'audit
// ---------------------------------------------------------------
export interface AuditEntry {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  beforeState: object | null;
  afterState: object | null;
  ipAddress: string | null;
  campusId: string | null;
}
