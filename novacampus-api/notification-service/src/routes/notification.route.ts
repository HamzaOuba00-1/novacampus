/**
 * routes/notification.route.ts
 * ---------------------------------------------------------------
 * Définition complète des routes du service notifications.
 *
 * Deux catégories :
 *   A) Routes internes (inter-services) : send, broadcast
 *      → Appelées par les autres microservices
 *      → Protégées par JWT + rôle admin ou header interne
 *
 *   B) Routes utilisateur : mes notifs, marquer lu, préférences
 *      → Appelées par les apps front-end
 *      → Protégées par JWT (tous rôles)
 *
 * La route WebSocket n'est pas définie ici :
 *   ws://host:3006/api/ws?token=<JWT>
 *   Elle est gérée directement dans index.ts via le WS server.
 *
 * Préfixe dans index.ts : /api
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as C from '../controllers/notification.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import {
  validateCreateNotification,
  validateBroadcast,
  validateUpdatePreferences,
} from '../middlewares/validation.middleware';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════
// ROUTES FIXES – avant les routes paramétrées
// ═══════════════════════════════════════════════

/**
 * GET /api/notifications/unread-count
 * Compteur de notifications non lues (badge UI)
 * Accès : tous les rôles
 */
router.get('/notifications/unread-count', C.getUnreadCount);

/**
 * PATCH /api/notifications/read-all
 * Marquer toutes les notifications comme lues
 * Accès : tous les rôles
 */
router.patch('/notifications/read-all', C.markAllAsRead);

/**
 * GET /api/notifications/preferences
 * Lire les préférences de notification
 * Accès : tous les rôles
 */
router.get('/notifications/preferences', C.getPreferences);

/**
 * PUT /api/notifications/preferences
 * Mettre à jour une préférence par type
 * Body : { notifType, pushEnabled?, emailEnabled?, websocketEnabled?, smsEnabled? }
 * Accès : tous les rôles
 */
router.put(
  '/notifications/preferences',
  validateUpdatePreferences,
  C.updatePreference
);

/**
 * GET /api/notifications/ws/stats
 * Statistiques des connexions WebSocket actives
 * Accès : admin, direction
 */
router.get(
  '/notifications/ws/stats',
  requireRole('admin', 'direction'),
  C.getWsStats
);

// ═══════════════════════════════════════════════
// ENVOI INTER-SERVICES (routes internes)
// ═══════════════════════════════════════════════

/**
 * POST /api/notifications/send
 * Envoyer une notification à un utilisateur
 * Appelé par les autres microservices
 * Body : { userId, type, title, body, channels?, refType?, refId? }
 * Accès : admin (en prod, utiliser un header de service interne)
 */
router.post(
  '/notifications/send',
  requireRole('admin'),
  validateCreateNotification,
  C.sendNotification
);

/**
 * POST /api/notifications/broadcast
 * Diffuser une notification à plusieurs utilisateurs
 * Body : { userIds[], type, title, body, channels?, refType?, refId? }
 * Accès : admin
 */
router.post(
  '/notifications/broadcast',
  requireRole('admin'),
  validateBroadcast,
  C.broadcastNotification
);

// ═══════════════════════════════════════════════
// NOTIFICATIONS UTILISATEUR
// ═══════════════════════════════════════════════

/**
 * GET /api/notifications
 * Mes notifications paginées
 * Query : ?isRead=false&type=grade_added&page=1&limit=20
 * Accès : tous les rôles
 */
router.get('/notifications', C.getMyNotifications);

/**
 * PATCH /api/notifications/:id/read
 * Marquer une notification comme lue
 * Accès : tous les rôles (propriétaire uniquement)
 */
router.patch('/notifications/:id/read', C.markAsRead);

export default router;
