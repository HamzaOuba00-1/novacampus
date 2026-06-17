/**
 * services/room.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour la gestion des salles et de leurs équipements.
 *
 * Couvre :
 *   – Listing avec filtres (campus, type, capacité, statut)
 *   – Détail d'une salle avec ses équipements
 *   – CRUD salles + gestion des équipements (RoomEquipment)
 *   – Disponibilité d'une salle sur une plage de dates
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import Room, { RoomAttributes } from '../models/room.model';
import RoomEquipment from '../models/roomEquipment.model';
import Schedule from '../models/schedule.model';
import ScheduleException from '../models/scheduleException.model';
import { RoomStatus, RoomType, EquipmentType } from '../types';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';
import { doTimesOverlap } from '../utils/timeOverlap.util';

/**
 * Liste les salles avec filtres optionnels.
 */
export async function listRooms(query: Record<string, string>) {
  const { campusId, type, status, minCapacity, equipment, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: WhereOptions = {};
  if (campusId) where['campusId'] = campusId;
  if (type) where['type'] = type as RoomType;
  if (status) where['status'] = status as RoomStatus;
  if (minCapacity) where['capacity'] = { [Op.gte]: parseInt(minCapacity, 10) };

  const { count, rows } = await Room.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['building', 'ASC'], ['code', 'ASC']],
  });

  // Si un filtre d'équipement est demandé, enrichir chaque salle
  let rooms = rows;
  if (equipment) {
    const filtered: Room[] = [];
    for (const room of rows) {
      const eq = await RoomEquipment.findOne({
        where: { roomId: room.id, equipmentType: equipment as EquipmentType },
      });
      if (eq) filtered.push(room);
    }
    rooms = filtered;
  }

  return { rooms, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Récupère une salle avec la liste de ses équipements.
 */
export async function getRoomById(id: string) {
  const room = await Room.findByPk(id);
  if (!room) throw new Error('Salle introuvable.');

  const equipment = await RoomEquipment.findAll({ where: { roomId: id } });
  return { ...room.toJSON(), equipment };
}

/**
 * Crée une nouvelle salle.
 */
export async function createRoom(data: {
  campusId: string;
  code: string;
  name: string;
  building: string;
  floor?: number;
  capacity: number;
  type: RoomType;
}) {
  const existing = await Room.findOne({ where: { code: data.code } });
  if (existing) throw new Error(`Une salle avec le code "${data.code}" existe déjà.`);
  return Room.create(data);
}

/**
 * Met à jour une salle (statut, capacité, nom…).
 */
export async function updateRoom(
  id: string,
  data: Partial<{
    name: string;
    building: string;
    floor: number;
    capacity: number;
    type: RoomType;
    status: RoomStatus;
  }>
) {
  const room = await Room.findByPk(id);
  if (!room) throw new Error('Salle introuvable.');
  return room.update(data);
}

/**
 * Ajoute ou met à jour un équipement dans une salle.
 */
export async function upsertEquipment(
  roomId: string,
  equipmentType: EquipmentType,
  quantity: number
) {
  const room = await Room.findByPk(roomId);
  if (!room) throw new Error('Salle introuvable.');

  const [eq, created] = await RoomEquipment.findOrCreate({
    where: { roomId, equipmentType },
    defaults: { roomId, equipmentType, quantity },
  });

  if (!created) await eq.update({ quantity });
  return eq;
}

/**
 * Retire un équipement d'une salle.
 */
export async function removeEquipment(roomId: string, equipmentType: EquipmentType) {
  const deleted = await RoomEquipment.destroy({ where: { roomId, equipmentType } });
  if (deleted === 0) throw new Error('Équipement introuvable sur cette salle.');
}

/**
 * Retourne les créneaux occupés d'une salle sur une plage de dates.
 * Utilisé pour afficher le calendrier de disponibilité d'une salle.
 *
 * @param roomId    - UUID de la salle
 * @param dateFrom  - Date de début "YYYY-MM-DD"
 * @param dateTo    - Date de fin "YYYY-MM-DD"
 */
export async function getRoomAvailability(
  roomId: string,
  dateFrom: string,
  dateTo: string
) {
  const room = await Room.findByPk(roomId);
  if (!room) throw new Error('Salle introuvable.');

  // Créneaux récurrents actifs affectés à cette salle
  const schedules = await Schedule.findAll({
    where: { roomId, status: 'active' },
  });

  // Exceptions ponctuelles affectant cette salle sur la période
  const exceptions = await ScheduleException.findAll({
    where: {
      exceptionDate: { [Op.between]: [dateFrom, dateTo] },
      newRoomId: roomId,
    },
  });

  return {
    room: room.toJSON(),
    schedules,
    exceptions,
    period: { from: dateFrom, to: dateTo },
  };
}
