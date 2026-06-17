/**
 * utils/serviceClient.util.ts  [NOUVEAU FICHIER]
 * ---------------------------------------------------------------
 * Client HTTP du planning-service vers les services dépendants.
 *
 * CORRECTION :
 *   notifyScheduleChange() → notifie les étudiants d'un changement
 *   de salle ou d'une annulation de séance via le notification-service.
 *   Remplace le console.log dans exception.service.ts
 * ---------------------------------------------------------------
 */

const NOTIFICATION_URL =
  process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:3006';

const INTERNAL_HEADERS = {
  'Content-Type': 'application/json',
  'X-Internal-Service': 'planning-service',
};

/**
 * Notifie les étudiants d'un changement de salle.
 * CORRECTION : appel HTTP réel vers notification-service
 */
export async function notifyRoomChange(
  studentUserIds: string[],
  courseId: string,
  exceptionDate: string,
  newRoomCode: string,
  reason: string,
  scheduleId: string
): Promise<void> {
  if (studentUserIds.length === 0) return;
  try {
    const res = await fetch(`${NOTIFICATION_URL}/api/notifications/internal/broadcast`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({
        userIds: studentUserIds,
        type: 'schedule_change',
        title: 'Changement de salle',
        body: `Le ${exceptionDate} : cours déplacé en salle ${newRoomCode}. ${reason}`,
        channels: ['websocket', 'push'],
        refType: 'Schedule',
        refId: scheduleId,
      }),
    });
    if (!res.ok) console.warn(`[PlanningService] notifyRoomChange → HTTP ${res.status}`);
  } catch (err) {
    console.warn('[PlanningService] notifyRoomChange indisponible:', (err as Error).message);
  }
}

/**
 * Notifie les étudiants d'un changement d'horaire.
 */
export async function notifyTimeChange(
  studentUserIds: string[],
  courseId: string,
  exceptionDate: string,
  newStartTime: string,
  newEndTime: string,
  reason: string,
  scheduleId: string
): Promise<void> {
  if (studentUserIds.length === 0) return;
  try {
    await fetch(`${NOTIFICATION_URL}/api/notifications/internal/broadcast`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({
        userIds: studentUserIds,
        type: 'schedule_change',
        title: 'Changement d\'horaire',
        body: `Le ${exceptionDate} : cours déplacé de ${newStartTime} à ${newEndTime}. ${reason}`,
        channels: ['websocket', 'push'],
        refType: 'Schedule',
        refId: scheduleId,
      }),
    });
  } catch (err) {
    console.warn('[PlanningService] notifyTimeChange indisponible:', (err as Error).message);
  }
}

/**
 * Notifie les étudiants d'une annulation de séance.
 */
export async function notifySessionCancelled(
  studentUserIds: string[],
  courseId: string,
  exceptionDate: string,
  reason: string,
  scheduleId: string
): Promise<void> {
  if (studentUserIds.length === 0) return;
  try {
    await fetch(`${NOTIFICATION_URL}/api/notifications/internal/broadcast`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({
        userIds: studentUserIds,
        type: 'schedule_cancelled',
        title: 'Séance annulée',
        body: `La séance du ${exceptionDate} est annulée. ${reason}`,
        channels: ['websocket', 'push'],
        refType: 'Schedule',
        refId: scheduleId,
      }),
    });
  } catch (err) {
    console.warn('[PlanningService] notifySessionCancelled indisponible:', (err as Error).message);
  }
}
