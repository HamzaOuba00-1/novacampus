/**
 * utils/serviceClient.util.ts  [NOUVEAU FICHIER]
 * ---------------------------------------------------------------
 * Client HTTP du service académique vers les services dépendants.
 *
 * CORRECTIONS :
 *   - notifyGradeAdded()    → notifie l'étudiant lors d'une nouvelle note
 *   - notifyGradeUpdated()  → notifie lors d'une correction de note
 *   - notifyDeadlineCreated / Updated → déjà dans deadline.service.ts (remplacé)
 * ---------------------------------------------------------------
 */

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:3006';

const INTERNAL_HEADERS = {
  'Content-Type': 'application/json',
  'X-Internal-Service': 'academic-service',
};

/**
 * Notifie un étudiant qu'une nouvelle note est disponible.
 * CORRECTION : appelée après createGrade() dans grade.service.ts
 *
 * @param userId     - UUID de l'utilisateur (auth-service) de l'étudiant
 * @param courseCode - Code du cours (ex: COM101)
 * @param label      - Libellé de l'évaluation (ex: "Partiel 1")
 * @param value      - Note obtenue (sur 20)
 */
export async function notifyGradeAdded(
  userId: string,
  courseCode: string,
  label: string,
  value: number
): Promise<void> {
  try {
    const response = await fetch(`${NOTIFICATION_URL}/api/notifications/internal/broadcast`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({
        userIds: [userId],
        type: 'grade_added',
        title: `Nouvelle note – ${courseCode}`,
        body: `Votre note pour "${label}" est disponible : ${value}/20.`,
        channels: ['websocket', 'push'],
        refType: 'Grade',
      }),
    });

    if (!response.ok) {
      console.warn(`[AcademicService] notifyGradeAdded → HTTP ${response.status}`);
    }
  } catch (err) {
    // Non bloquant — la note est enregistrée même si la notif échoue
    console.warn('[AcademicService] notifyGradeAdded indisponible:', (err as Error).message);
  }
}

/**
 * Notifie un étudiant qu'une note a été corrigée.
 * CORRECTION : appelée après updateGrade() dans grade.service.ts
 */
export async function notifyGradeUpdated(
  userId: string,
  courseCode: string,
  label: string,
  oldValue: number,
  newValue: number
): Promise<void> {
  try {
    await fetch(`${NOTIFICATION_URL}/api/notifications/internal/broadcast`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({
        userIds: [userId],
        type: 'grade_updated',
        title: `Note modifiée – ${courseCode}`,
        body: `Votre note pour "${label}" a été corrigée : ${oldValue}/20 → ${newValue}/20.`,
        channels: ['websocket', 'push'],
        refType: 'Grade',
      }),
    });
  } catch (err) {
    console.warn('[AcademicService] notifyGradeUpdated indisponible:', (err as Error).message);
  }
}

/**
 * Notifie les étudiants d'une nouvelle deadline.
 * Remplace le console.log dans deadline.service.ts
 */
export async function notifyDeadlineCreated(
  studentUserIds: string[],
  courseCode: string,
  deadlineTitle: string,
  dueAt: Date,
  deadlineId: string
): Promise<void> {
  if (studentUserIds.length === 0) return;
  try {
    await fetch(`${NOTIFICATION_URL}/api/notifications/internal/broadcast`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({
        userIds: studentUserIds,
        type: 'deadline_created',
        title: `Nouveau rendu – ${courseCode}`,
        body: `"${deadlineTitle}" à rendre avant le ${dueAt.toLocaleDateString('fr-FR')}.`,
        channels: ['websocket', 'push'],
        refType: 'Deadline',
        refId: deadlineId,
      }),
    });
  } catch (err) {
    console.warn('[AcademicService] notifyDeadlineCreated indisponible:', (err as Error).message);
  }
}

/**
 * Notifie les étudiants d'un changement de date limite.
 * Remplace le console.log dans deadline.service.ts
 */
export async function notifyDeadlineUpdated(
  studentUserIds: string[],
  courseCode: string,
  deadlineTitle: string,
  previousDueAt: Date,
  newDueAt: Date,
  deadlineId: string
): Promise<void> {
  if (studentUserIds.length === 0) return;
  try {
    await fetch(`${NOTIFICATION_URL}/api/notifications/internal/broadcast`, {
      method: 'POST',
      headers: INTERNAL_HEADERS,
      body: JSON.stringify({
        userIds: studentUserIds,
        type: 'deadline_updated',
        title: `Date limite modifiée – ${courseCode}`,
        body:
          `La date limite pour "${deadlineTitle}" a changé : ` +
          `${previousDueAt.toLocaleDateString('fr-FR')} → ${newDueAt.toLocaleDateString('fr-FR')}.`,
        channels: ['websocket', 'push'],
        refType: 'Deadline',
        refId: deadlineId,
      }),
    });
  } catch (err) {
    console.warn('[AcademicService] notifyDeadlineUpdated indisponible:', (err as Error).message);
  }
}
