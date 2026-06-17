/**
 * controllers/notification.controller.ts
 * ---------------------------------------------------------------
 * Contrôleurs pour toutes les ressources du service notifications.
 *
 * Organisation :
 *   – Envoi    : send (unitaire), broadcast (groupé)
 *   – Lecture  : mes notifs, compteur non-lus
 *   – Actions  : marquer lu, marquer tout lu
 *   – Prefs    : lire et modifier les préférences
 *   – Stats    : métriques des connexions WS (admin)
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as NotifService from '../services/notification.service';
import { getConnectionStats } from '../gateways/websocket.gateway';

// ═══════════════════════════════════════════════
// ENVOI – routes internes (inter-services)
// ═══════════════════════════════════════════════

/**
 * POST /api/notifications/send
 * Envoie une notification à un utilisateur unique.
 * Appelé par les autres microservices (academic, planning, payment…).
 */
export async function sendNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const notification = await NotifService.sendNotification(req.body);
    res.status(201).json({ status: 'success', data: notification });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_SEND_NOTIF', message: (err as Error).message });
  }
}

/**
 * POST /api/notifications/broadcast
 * Diffuse une notification à plusieurs utilisateurs.
 * Appelé par les autres microservices pour les événements groupés.
 */
export async function broadcastNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await NotifService.broadcastNotification(req.body);
    res.status(201).json({
      status: 'success',
      data: result,
      message: `${result.persisted}/${result.total} notification(s) envoyée(s).`,
    });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_BROADCAST', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// CONSULTATION – routes utilisateur
// ═══════════════════════════════════════════════

/**
 * GET /api/notifications
 * Mes notifications paginées.
 * Query : ?isRead=false&type=grade_added&page=1&limit=20
 */
export async function getMyNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await NotifService.getMyNotifications(
      req.user!.id,
      req.query as Record<string, string>
    );
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_GET_NOTIFS', message: (err as Error).message });
  }
}

/**
 * GET /api/notifications/unread-count
 * Nombre de notifications non lues (badge de la cloche UI).
 */
export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
  try {
    const count = await NotifService.getUnreadCount(req.user!.id);
    res.status(200).json({ status: 'success', data: { count } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_UNREAD_COUNT', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════

/**
 * PATCH /api/notifications/:id/read
 * Marque une notification comme lue.
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const notification = await NotifService.markAsRead(req.params.id, req.user!.id);
    res.status(200).json({ status: 'success', data: notification });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_MARK_READ', message: (err as Error).message });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marque toutes les notifications comme lues.
 */
export async function markAllAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const updated = await NotifService.markAllAsRead(req.user!.id);
    res.status(200).json({
      status: 'success',
      message: `${updated} notification(s) marquée(s) comme lue(s).`,
      data: { updatedCount: updated },
    });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_MARK_ALL_READ', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// PRÉFÉRENCES
// ═══════════════════════════════════════════════

/**
 * GET /api/notifications/preferences
 * Lire toutes mes préférences de notification.
 */
export async function getPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const preferences = await NotifService.getPreferences(req.user!.id);
    res.status(200).json({ status: 'success', data: { preferences } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_GET_PREFS', message: (err as Error).message });
  }
}

/**
 * PUT /api/notifications/preferences
 * Mettre à jour une préférence par type de notification.
 * Body : { notifType, pushEnabled?, emailEnabled?, websocketEnabled?, smsEnabled? }
 */
export async function updatePreference(req: AuthenticatedRequest, res: Response) {
  try {
    const { notifType, pushEnabled, emailEnabled, websocketEnabled, smsEnabled } = req.body;
    const pref = await NotifService.updatePreference(req.user!.id, notifType, {
      pushEnabled,
      emailEnabled,
      websocketEnabled,
      smsEnabled,
    });
    res.status(200).json({ status: 'success', data: pref });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_UPDATE_PREF', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// STATISTIQUES WEBSOCKET (admin)
// ═══════════════════════════════════════════════

/**
 * GET /api/notifications/ws/stats
 * Connexions WebSocket actives (nombre d'utilisateurs et de sessions).
 * Utilisé par le monitoring et le dashboard admin.
 */
export function getWsStats(_req: AuthenticatedRequest, res: Response) {
  try {
    const stats = getConnectionStats();
    res.status(200).json({ status: 'success', data: stats });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_WS_STATS', message: (err as Error).message });
  }
}
