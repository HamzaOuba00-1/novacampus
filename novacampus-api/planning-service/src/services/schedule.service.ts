/**
 * services/schedule.service.ts
 * ---------------------------------------------------------------
 * PATCH appliqué sur getScheduleForWeek :
 *   Si courseIds est vide ([]) :
 *     – instructor → retourne ses créneaux filtrés par instructorId
 *     – student    → retourne tous les créneaux actifs du semestre
 *   Permet de fonctionner sans inscription-service.
 * ---------------------------------------------------------------
 */

import { Op } from 'sequelize';
import Schedule from '../models/schedule.model';
import ScheduleException from '../models/scheduleException.model';
import RoomConflict from '../models/roomConflict.model';
import Room from '../models/room.model';
import { ScheduleStatus, ExceptionType, ScheduleSlot } from '../types';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';
import { doTimesOverlap, isValidTimeRange } from '../utils/timeOverlap.util';

function getDateOfWeekDay(isoWeek: string, dayOfWeek: number): string {
  const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!match) throw new Error('Format de semaine invalide. Attendu : YYYY-WWW (ex: 2024-W03)');

  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);

  const jan4 = new Date(year, 0, 4);
  const startOfWeek = new Date(jan4);
  startOfWeek.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);

  const targetDate = new Date(startOfWeek);
  targetDate.setDate(startOfWeek.getDate() + dayOfWeek);

  return targetDate.toISOString().split('T')[0];
}

async function detectConflicts(
  scheduleData: {
    roomId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    academicYear: number;
    semester: number;
  },
  excludeScheduleId?: string
): Promise<Schedule[]> {
  const where: Record<string, unknown> = {
    roomId: scheduleData.roomId,
    dayOfWeek: scheduleData.dayOfWeek,
    academicYear: scheduleData.academicYear,
    semester: scheduleData.semester,
    status: 'active',
  };
  if (excludeScheduleId) where['id'] = { [Op.ne]: excludeScheduleId };

  const existing = await Schedule.findAll({ where });

  return existing.filter((s) =>
    doTimesOverlap(scheduleData.startTime, scheduleData.endTime, s.startTime, s.endTime)
  );
}

export async function listSchedules(query: Record<string, string>) {
  const { courseId, instructorId, roomId, campusId, academicYear, semester, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: Record<string, unknown> = {};
  if (courseId) where['courseId'] = courseId;
  if (instructorId) where['instructorId'] = instructorId;
  if (roomId) where['roomId'] = roomId;
  if (academicYear) where['academicYear'] = parseInt(academicYear, 10);
  if (semester) where['semester'] = parseInt(semester, 10);

  if (campusId) {
    const campusRooms = await Room.findAll({ where: { campusId }, attributes: ['id'] });
    where['roomId'] = { [Op.in]: campusRooms.map((r) => r.id) };
  }

  const { count, rows } = await Schedule.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']],
  });

  return { schedules: rows, meta: buildPaginationMeta(count, page, limit) };
}

export async function createSchedule(data: {
  courseId: string;
  instructorId: string;
  roomId: string;
  academicYear: number;
  semester: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  if (!isValidTimeRange(data.startTime, data.endTime)) {
    throw new Error('L\'heure de fin doit être postérieure à l\'heure de début.');
  }

  const room = await Room.findByPk(data.roomId);
  if (!room) throw new Error('Salle introuvable.');
  if (room.status !== 'available') {
    throw new Error(`La salle ${room.code} n'est pas disponible (statut : ${room.status}).`);
  }

  const schedule = await Schedule.create(data);

  const conflicting = await detectConflicts(data);
  for (const conflict of conflicting) {
    await RoomConflict.create({
      roomId: data.roomId,
      scheduleAId: schedule.id,
      scheduleBId: conflict.id,
    });
  }

  return {
    schedule,
    conflicts: conflicting.length,
    hasConflicts: conflicting.length > 0,
  };
}

export async function updateSchedule(
  id: string,
  data: Partial<{
    roomId: string;
    instructorId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    status: ScheduleStatus;
  }>
) {
  const schedule = await Schedule.findByPk(id);
  if (!schedule) throw new Error('Créneau introuvable.');

  await schedule.update(data);

  const needsConflictCheck = data.roomId || data.dayOfWeek !== undefined
    || data.startTime || data.endTime;

  if (needsConflictCheck) {
    const updatedSchedule = await Schedule.findByPk(id);
    if (updatedSchedule) {
      const conflicting = await detectConflicts(
        {
          roomId: updatedSchedule.roomId,
          dayOfWeek: updatedSchedule.dayOfWeek,
          startTime: updatedSchedule.startTime,
          endTime: updatedSchedule.endTime,
          academicYear: updatedSchedule.academicYear,
          semester: updatedSchedule.semester,
        },
        id
      );

      for (const conflict of conflicting) {
        const existing = await RoomConflict.findOne({
          where: {
            [Op.or]: [
              { scheduleAId: id, scheduleBId: conflict.id },
              { scheduleAId: conflict.id, scheduleBId: id },
            ],
          },
        });
        if (!existing) {
          await RoomConflict.create({
            roomId: updatedSchedule.roomId,
            scheduleAId: id,
            scheduleBId: conflict.id,
          });
        }
      }
    }
  }

  return schedule;
}

export async function cancelSchedule(id: string) {
  const schedule = await Schedule.findByPk(id);
  if (!schedule) throw new Error('Créneau introuvable.');
  return schedule.update({ status: 'cancelled' });
}

/**
 * Construit l'emploi du temps d'une semaine.
 *
 * PATCH : courseIds optionnel
 *   – courseIds.length > 0 → filtre par ces cours (comportement original)
 *   – courseIds.length === 0 :
 *       • instructor → tous ses créneaux (filtré par instructorId)
 *       • student    → tous les créneaux actifs (pas de filtre cours)
 *         Utile quand l'inscription-service n'est pas encore déployé.
 */
export async function getScheduleForWeek(
  ownerId: string,
  ownerType: 'student' | 'instructor',
  isoWeek: string,
  courseIds: string[]
): Promise<ScheduleSlot[]> {

  const where: Record<string, unknown> = { status: 'active' };

  if (courseIds.length > 0) {
    // Comportement original : filtre par cours fournis
    where['courseId'] = { [Op.in]: courseIds };
  }

  // Enseignant : toujours filtré par son propre ID
  if (ownerType === 'instructor') {
    where['instructorId'] = ownerId;
  }

  const schedules = await Schedule.findAll({
    where,
    order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']],
  });

  const slots: ScheduleSlot[] = [];

  for (const s of schedules) {
    const slotDate = getDateOfWeekDay(isoWeek, s.dayOfWeek);

    const exception = await ScheduleException.findOne({
      where: { scheduleId: s.id, exceptionDate: slotDate },
    });

    if (exception?.type === 'cancelled') continue;

    const roomId = exception?.newRoomId ?? s.roomId;
    const room = await Room.findByPk(roomId);

    slots.push({
      scheduleId: s.id,
      courseId: s.courseId,
      courseName: '',
      courseCode: '',
      instructorId: s.instructorId,
      room: {
        id: room?.id ?? roomId,
        code: room?.code ?? '',
        name: room?.name ?? '',
        building: room?.building ?? '',
      },
      dayOfWeek: s.dayOfWeek as ScheduleSlot['dayOfWeek'],
      startTime: exception?.newStartTime ?? s.startTime,
      endTime: exception?.newEndTime ?? s.endTime,
      academicYear: s.academicYear,
      semester: s.semester,
      exception: exception
        ? {
            type: exception.type,
            newRoom: exception.newRoomId ?? undefined,
            newStartTime: exception.newStartTime ?? undefined,
            newEndTime: exception.newEndTime ?? undefined,
            reason: exception.reason ?? '',
          }
        : null,
    });
  }

  return slots;
}
