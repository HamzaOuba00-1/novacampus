/**
 * services/exception.service.ts
 * ---------------------------------------------------------------
 * CORRECTION APPLIQUÉE :
 *   emitNotificationEvent() remplacé par des appels réels vers
 *   le notification-service via serviceClient.util.ts
 *
 *   AVANT : console.log(…) → notifications jamais envoyées
 *   APRÈS : fetch réel vers /api/notifications/internal/broadcast
 * ---------------------------------------------------------------
 */

import ScheduleException from '../models/scheduleException.model';
import Schedule from '../models/schedule.model';
import Room from '../models/room.model';
import { ExceptionType } from '../types';
import { isValidTimeRange } from '../utils/timeOverlap.util';
import {
  notifyRoomChange,
  notifyTimeChange,
  notifySessionCancelled,
} from '../utils/serviceClient.util';

// ---------------------------------------------------------------
// Récupération des étudiants inscrits au cours du créneau
// Le planning-service n'a pas accès aux enrollments (academic-service).
// On passe les studentUserIds directement depuis le payload client
// ou on appelle l'academic-service pour les résoudre.
// Pour l'instant : les studentUserIds sont passés dans le body si disponibles.
// TODO : appel vers academic-service /api/courses/:id/enrollments
// ---------------------------------------------------------------

/**
 * Crée une exception ponctuelle et notifie les étudiants concernés.
 * CORRECTION : remplace console.log par vrais appels notification
 */
export async function createException(
  scheduleId: string,
  createdBy: string,
  data: {
    exceptionDate: string;
    type: ExceptionType;
    newRoomId?: string;
    newStartTime?: string;
    newEndTime?: string;
    reason?: string;
    // NOUVEAU : UUIDs des étudiants inscrits au cours (passés par le client admin)
    // ou récupérés via l'academic-service
    studentUserIds?: string[];
  }
) {
  const schedule = await Schedule.findByPk(scheduleId);
  if (!schedule) throw new Error('Créneau introuvable.');

  if (data.type === 'room_change') {
    if (!data.newRoomId) throw new Error('newRoomId est obligatoire pour un changement de salle.');
    const newRoom = await Room.findByPk(data.newRoomId);
    if (!newRoom) throw new Error('Nouvelle salle introuvable.');
    if (newRoom.status !== 'available') {
      throw new Error(`La salle ${newRoom.code} n'est pas disponible.`);
    }
  }

  if (data.type === 'time_change') {
    if (!data.newStartTime || !data.newEndTime) {
      throw new Error('newStartTime et newEndTime sont obligatoires pour un changement d\'horaire.');
    }
    if (!isValidTimeRange(data.newStartTime, data.newEndTime)) {
      throw new Error('L\'heure de fin doit être postérieure à l\'heure de début.');
    }
  }

  const existing = await ScheduleException.findOne({
    where: { scheduleId, exceptionDate: data.exceptionDate },
  });
  if (existing) {
    throw new Error(`Une exception existe déjà pour ce créneau le ${data.exceptionDate}.`);
  }

  const exception = await ScheduleException.create({
    scheduleId,
    exceptionDate: data.exceptionDate,
    type: data.type,
    newRoomId: data.newRoomId ?? null,
    newStartTime: data.newStartTime ?? null,
    newEndTime: data.newEndTime ?? null,
    reason: data.reason ?? null,
    createdBy,
  });

  // CORRECTION : notifications réelles selon le type d'exception
  const studentUserIds = data.studentUserIds ?? [];
  const reason = data.reason ?? '';

  if (data.type === 'room_change' && data.newRoomId) {
    const newRoom = await Room.findByPk(data.newRoomId);
    notifyRoomChange(
      studentUserIds,
      schedule.courseId,
      data.exceptionDate,
      newRoom?.code ?? data.newRoomId,
      reason,
      scheduleId
    ).catch(() => {});

  } else if (data.type === 'time_change' && data.newStartTime && data.newEndTime) {
    notifyTimeChange(
      studentUserIds,
      schedule.courseId,
      data.exceptionDate,
      data.newStartTime,
      data.newEndTime,
      reason,
      scheduleId
    ).catch(() => {});

  } else if (data.type === 'cancelled') {
    notifySessionCancelled(
      studentUserIds,
      schedule.courseId,
      data.exceptionDate,
      reason,
      scheduleId
    ).catch(() => {});
  }

  return exception;
}

/**
 * Retourne toutes les exceptions d'un créneau.
 */
export async function getExceptionsBySchedule(scheduleId: string) {
  const schedule = await Schedule.findByPk(scheduleId);
  if (!schedule) throw new Error('Créneau introuvable.');

  return ScheduleException.findAll({
    where: { scheduleId },
    order: [['exceptionDate', 'ASC']],
  });
}

/**
 * Supprime une exception (revient au créneau d'origine).
 */
export async function deleteException(exceptionId: string) {
  const exception = await ScheduleException.findByPk(exceptionId);
  if (!exception) throw new Error('Exception introuvable.');
  await exception.destroy();
}
