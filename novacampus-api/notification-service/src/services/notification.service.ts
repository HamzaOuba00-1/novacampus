/**
 * services/notification.service.ts
 * ---------------------------------------------------------------
 * Logique métier centrale du service de notifications.
 *
 * Responsabilités :
 *   1. Créer une notification persistée en base (toujours)
 *   2. Appliquer les préférences utilisateur (canal actif ?)
 *   3. Livrer via WebSocket si l'utilisateur est connecté
 *   4. Envoyer par email/SMS/push selon les canaux configurés
 *   5. Fournir les endpoints de consultation (liste, marquer lu)
 *   6. Gérer les préférences utilisateur par type de notification
 *
 * Point d'entrée unique pour tous les autres microservices :
 *   POST /api/notifications/send         → envoi unitaire
 *   POST /api/notifications/broadcast    → envoi groupé
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import Notification from '../models/notification.model';
import NotificationPreference from '../models/notificationPreference.model';
import { sendToUser, broadcastToUsers } from '../gateways/websocket.gateway';
import { sendEmail, sendSms, sendPush } from '../utils/channels.util';
import {
  CreateNotificationPayload,
  BroadcastPayload,
  NotificationChannel,
  NotificationPreference as NotifPrefType,
  WsMessage,
} from '../types';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';

// ---------------------------------------------------------------
// Canaux par défaut si aucune préférence n'est définie
// ---------------------------------------------------------------
const DEFAULT_CHANNELS: NotificationChannel[] = ['websocket', 'push'];

// ---------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------

/**
 * Récupère les canaux actifs pour un utilisateur et un type de notif.
 * Si aucune préférence n'existe → retourne les canaux par défaut.
 */
async function getActiveChannels(
  userId: string,
  notifType: string,
  requestedChannels?: NotificationChannel[]
): Promise<NotificationChannel[]> {
  const pref = await NotificationPreference.findOne({
    where: { userId, notifType },
  });

  if (!pref) return requestedChannels ?? DEFAULT_CHANNELS;

  const active: NotificationChannel[] = [];
  if (pref.websocketEnabled) active.push('websocket');
  if (pref.pushEnabled) active.push('push');
  if (pref.emailEnabled) active.push('email');
  if (pref.smsEnabled) active.push('sms');

  // Intersection avec les canaux demandés si précisés
  if (requestedChannels && requestedChannels.length > 0) {
    return active.filter((c) => requestedChannels.includes(c));
  }

  return active.length > 0 ? active : DEFAULT_CHANNELS;
}

// ---------------------------------------------------------------
// Création et livraison d'une notification unitaire
// ---------------------------------------------------------------

/**
 * Crée et livre une notification à un utilisateur unique.
 * Persistée en base même si l'utilisateur est hors ligne.
 *
 * Flux :
 *   1. Vérifier les préférences utilisateur
 *   2. Persister en base (channel = canal principal)
 *   3. Livrer via WebSocket (immédiat si connecté)
 *   4. Envoyer par email/SMS/push selon les canaux actifs
 *
 * @param payload - Données de la notification à créer
 * @returns La notification persistée
 */
export async function sendNotification(payload: CreateNotificationPayload) {
  const activeChannels = await getActiveChannels(
    payload.userId,
    payload.type,
    payload.channels
  );

  // Canal principal stocké en base (websocket en priorité, sinon le premier)
  const primaryChannel: NotificationChannel =
    activeChannels.includes('websocket') ? 'websocket'
    : activeChannels.includes('push') ? 'push'
    : activeChannels.includes('email') ? 'email'
    : 'sms';

  // Persistance en base
  const notification = await Notification.create({
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    channel: primaryChannel,
    refType: payload.refType ?? null,
    refId: payload.refId ?? null,
    sentAt: new Date(),
  });

  // Livraison WebSocket (temps réel)
  if (activeChannels.includes('websocket')) {
    const wsMessage: WsMessage = {
      type: 'notification',
      payload: {
        id: notification.id,
        notificationType: payload.type,
        title: payload.title,
        body: payload.body,
        refType: payload.refType,
        refId: payload.refId,
        createdAt: notification.sentAt.toISOString(),
      },
    };
    const delivered = sendToUser(payload.userId, wsMessage);
    if (delivered > 0) {
      console.log(`[NotifService] WS livré à userId=${payload.userId} (${delivered} session(s))`);
    }
  }

  // Envoi email (asynchrone, non bloquant)
  if (activeChannels.includes('email')) {
    sendEmail({
      to: `${payload.userId}@novacampus.fr`, // À remplacer par email réel via auth-service
      subject: payload.title,
      body: payload.body,
    }).catch((err) => console.error('[NotifService] Email error:', err));
  }

  // Envoi SMS (asynchrone, non bloquant)
  if (activeChannels.includes('sms')) {
    sendSms({
      to: '+33600000000', // À remplacer par téléphone réel via inscription-service
      message: `${payload.title} : ${payload.body}`,
    }).catch((err) => console.error('[NotifService] SMS error:', err));
  }

  // Envoi push (asynchrone, non bloquant)
  if (activeChannels.includes('push')) {
    sendPush({
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      data: payload.refType ? { refType: payload.refType, refId: payload.refId ?? '' } : undefined,
    }).catch((err) => console.error('[NotifService] Push error:', err));
  }

  return notification;
}

// ---------------------------------------------------------------
// Diffusion groupée (broadcast)
// ---------------------------------------------------------------

/**
 * Envoie une notification à plusieurs utilisateurs en parallèle.
 * Utilisé pour les événements qui concernent un groupe :
 *   – Changement de salle → tous les étudiants du cours
 *   – Nouvelle deadline → tous les étudiants inscrits
 *   – Alerte IA → admins d'un campus
 *
 * @param payload - Données incluant la liste des userIds
 * @returns Statistiques de livraison
 */
export async function broadcastNotification(payload: BroadcastPayload): Promise<{
  total: number;
  persisted: number;
  wsDelivered: number;
}> {
  let persisted = 0;

  // Traitement en parallèle par batch de 10 pour éviter de surcharger la DB
  const BATCH_SIZE = 10;
  for (let i = 0; i < payload.userIds.length; i += BATCH_SIZE) {
    const batch = payload.userIds.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (userId) => {
        try {
          await sendNotification({ ...payload, userId });
          persisted++;
        } catch (err) {
          console.error(`[NotifService] Broadcast error userId=${userId}:`, (err as Error).message);
        }
      })
    );
  }

  // Livraison WebSocket groupée pour les utilisateurs connectés
  const wsMessage: WsMessage = {
    type: 'notification',
    payload: {
      id: 'broadcast',
      notificationType: payload.type,
      title: payload.title,
      body: payload.body,
      refType: payload.refType,
      refId: payload.refId,
      createdAt: new Date().toISOString(),
    },
  };
  const wsDelivered = broadcastToUsers(payload.userIds, wsMessage);

  console.log(`[NotifService] Broadcast terminé : ${persisted}/${payload.userIds.length} persistées, ${wsDelivered} WS livrées.`);

  return { total: payload.userIds.length, persisted, wsDelivered };
}

// ---------------------------------------------------------------
// Consultation
// ---------------------------------------------------------------

/**
 * Retourne les notifications d'un utilisateur, paginées.
 */
export async function getMyNotifications(
  userId: string,
  query: Record<string, string>
) {
  const { isRead, type, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: WhereOptions = { userId };
  if (isRead !== undefined) where['isRead'] = isRead === 'true';
  if (type) where['type'] = type;

  const { count, rows } = await Notification.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['sentAt', 'DESC']],
  });

  return { notifications: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Marque une notification comme lue.
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId },
  });
  if (!notification) throw new Error('Notification introuvable.');
  if (notification.isRead) return notification;

  return notification.update({ isRead: true, readAt: new Date() });
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues.
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const [updated] = await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { userId, isRead: false } }
  );
  return updated;
}

/**
 * Retourne le nombre de notifications non lues d'un utilisateur.
 * Utilisé par le badge de la cloche de notification dans le front.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.count({ where: { userId, isRead: false } });
}

// ---------------------------------------------------------------
// Préférences utilisateur
// ---------------------------------------------------------------

/**
 * Retourne toutes les préférences de notification d'un utilisateur.
 */
export async function getPreferences(userId: string) {
  return NotificationPreference.findAll({ where: { userId } });
}

/**
 * Met à jour une préférence de notification.
 * Crée l'entrée si elle n'existe pas (upsert).
 */
export async function updatePreference(
  userId: string,
  notifType: string,
  channels: Partial<{
    pushEnabled: boolean;
    emailEnabled: boolean;
    websocketEnabled: boolean;
    smsEnabled: boolean;
  }>
) {
  const [pref, created] = await NotificationPreference.findOrCreate({
    where: { userId, notifType: notifType as any },
    defaults: {
      userId,
      notifType: notifType as any,
      ...channels,
    },
  });

  if (!created) {
    await pref.update(channels);
  }

  return pref;
}
