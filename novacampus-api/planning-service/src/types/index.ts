/**
 * types/index.ts
 * ---------------------------------------------------------------
 * Interfaces et types TypeScript partagés dans tout le service
 * de planification. Centraliser ici garantit la cohérence entre
 * les couches model, service et controller.
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
// Format de réponse normalisé – identique aux autres services
// ---------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  status: 'success' | 'failure' | 'pending';
  data?: T;
  message?: string;
  code?: string;
  meta?: PaginationMeta;
}

// ---------------------------------------------------------------
// Métadonnées de pagination
// ---------------------------------------------------------------
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------
// Types ENUM reflétant les valeurs en base de données
// ---------------------------------------------------------------

/** Type de salle physique */
export type RoomType = 'amphitheater' | 'td' | 'lab' | 'seminar';

/** Statut d'une salle */
export type RoomStatus = 'available' | 'maintenance' | 'closed';

/** Type d'équipement disponible dans une salle */
export type EquipmentType = 'projector' | 'whiteboard' | 'pc' | 'gpu' | 'audio';

/** Statut d'un créneau récurrent */
export type ScheduleStatus = 'active' | 'cancelled' | 'modified';

/** Type de modification ponctuelle d'un créneau */
export type ExceptionType = 'room_change' | 'time_change' | 'cancelled';

/** Statut d'un conflit de salle */
export type ConflictStatus = 'open' | 'resolved' | 'ignored';

/** Jour de la semaine (0 = Lundi … 6 = Dimanche) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ---------------------------------------------------------------
// Structure d'un créneau pour l'affichage de l'emploi du temps
// ---------------------------------------------------------------
export interface ScheduleSlot {
  scheduleId: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  instructorId: string;
  room: {
    id: string;
    code: string;
    name: string;
    building: string;
  };
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  academicYear: number;
  semester: number;
  exception?: {
    type: ExceptionType;
    newRoom?: string;
    newStartTime?: string;
    newEndTime?: string;
    reason: string;
  } | null;
}
