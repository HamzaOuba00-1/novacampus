/**
 * services/conflict.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour la consultation et la résolution des conflits
 * de salles détectés automatiquement lors de la création de créneaux.
 *
 * L'administrateur peut :
 *   – Consulter tous les conflits ouverts de son campus
 *   – Marquer un conflit comme résolu ou ignoré
 * ---------------------------------------------------------------
 */

import RoomConflict from '../models/roomConflict.model';
import Schedule from '../models/schedule.model';
import Room from '../models/room.model';
import { ConflictStatus } from '../types';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';

/**
 * Liste les conflits avec filtres.
 */
export async function listConflicts(query: Record<string, string>) {
  const { status, campusId, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: Record<string, unknown> = {};
  if (status) where['status'] = status as ConflictStatus;

  // Filtrage par campus via jointure avec rooms
  if (campusId) {
    const campusRooms = await Room.findAll({ where: { campusId }, attributes: ['id'] });
    where['roomId'] = campusRooms.map((r) => r.id);
  }

  const { count, rows } = await RoomConflict.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['detectedAt', 'DESC']],
  });

  // Enrichissement avec les données des créneaux en conflit
  const enriched = await Promise.all(
    rows.map(async (conflict) => {
      const [scheduleA, scheduleB, room] = await Promise.all([
        Schedule.findByPk(conflict.scheduleAId),
        Schedule.findByPk(conflict.scheduleBId),
        Room.findByPk(conflict.roomId),
      ]);

      return {
        ...conflict.toJSON(),
        room: room ? { id: room.id, code: room.code, name: room.name } : null,
        scheduleA: scheduleA
          ? {
              id: scheduleA.id,
              courseId: scheduleA.courseId,
              dayOfWeek: scheduleA.dayOfWeek,
              startTime: scheduleA.startTime,
              endTime: scheduleA.endTime,
            }
          : null,
        scheduleB: scheduleB
          ? {
              id: scheduleB.id,
              courseId: scheduleB.courseId,
              dayOfWeek: scheduleB.dayOfWeek,
              startTime: scheduleB.startTime,
              endTime: scheduleB.endTime,
            }
          : null,
      };
    })
  );

  return { conflicts: enriched, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Résout ou ignore un conflit.
 *
 * @param conflictId - UUID du conflit
 * @param status     - 'resolved' ou 'ignored'
 * @param resolvedBy - UUID de l'administrateur
 */
export async function resolveConflict(
  conflictId: string,
  status: 'resolved' | 'ignored',
  resolvedBy: string
) {
  const conflict = await RoomConflict.findByPk(conflictId);
  if (!conflict) throw new Error('Conflit introuvable.');
  if (conflict.status !== 'open') {
    throw new Error('Ce conflit a déjà été traité.');
  }

  return conflict.update({
    status,
    resolvedBy,
    resolvedAt: new Date(),
  });
}
