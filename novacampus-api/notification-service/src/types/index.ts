/**
 * types/index.ts
 * ---------------------------------------------------------------
 * Interfaces et types TypeScript partagés dans tout le service
 * de notifications. Couvre les canaux d'envoi, les types
 * d'événements, les préférences et les structures WebSocket.
 * ---------------------------------------------------------------
 */
import { Request } from 'express';
import { WebSocket } from 'ws';

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
// Types d'événements de notification
// Chaque valeur correspond à un déclencheur métier précis
// ---------------------------------------------------------------
export type NotificationType =
  | 'schedule_change'      // Changement de salle ou d'horaire
  | 'schedule_cancelled'   // Séance annulée
  | 'grade_added'          // Nouvelle note saisie
  | 'grade_updated'        // Note corrigée
  | 'absence_recorded'     // Absence enregistrée
  | 'deadline_created'     // Nouvelle deadline
  | 'deadline_updated'     // Date limite modifiée
  | 'payment_reminder'     // Relance de paiement
  | 'payment_received'     // Paiement confirmé
  | 'payment_overdue'      // Facture en retard
  | 'ai_alert'             // Alerte générée par l'agent IA
  | 'account_activated'    // Compte activé/désactivé
  | 'document_verified'    // Document vérifié ou rejeté
  | 'system';              // Message système général

// ---------------------------------------------------------------
// Canaux d'envoi
// ---------------------------------------------------------------
export type NotificationChannel = 'push' | 'email' | 'websocket' | 'sms';

// ---------------------------------------------------------------
// Préférences de notification par type et par canal
// Permet à chaque utilisateur de contrôler quels canaux
// sont actifs pour chaque type d'événement
// ---------------------------------------------------------------
export interface NotificationPreference {
  userId: string;
  notifType: NotificationType;
  pushEnabled: boolean;
  emailEnabled: boolean;
  websocketEnabled: boolean;
  smsEnabled: boolean;
}

// ---------------------------------------------------------------
// Client WebSocket enrichi avec l'identité de l'utilisateur
// ---------------------------------------------------------------
export interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  role?: UserRole;
  isAlive?: boolean;
}

// ---------------------------------------------------------------
// Message envoyé via WebSocket (format JSON normalisé)
// ---------------------------------------------------------------
export interface WsMessage {
  type: 'notification' | 'ping' | 'pong' | 'error';
  payload?: {
    id: string;
    notificationType: NotificationType;
    title: string;
    body: string;
    refType?: string;
    refId?: string;
    createdAt: string;
  };
}

// ---------------------------------------------------------------
// Payload pour créer une notification (API interne inter-services)
// ---------------------------------------------------------------
export interface CreateNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  refType?: string;
  refId?: string;
}

// ---------------------------------------------------------------
// Payload pour envoyer une notification groupée
// ---------------------------------------------------------------
export interface BroadcastPayload {
  userIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  channels?: NotificationChannel[];
  refType?: string;
  refId?: string;
}