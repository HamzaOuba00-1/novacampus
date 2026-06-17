/**
 * controllers/stats.controller.ts  [NOUVEAU FICHIER]
 * ---------------------------------------------------------------
 * Endpoint agrégé de statistiques d'occupation des salles par campus.
 * Utilisé par le reporting-service pour calculer roomOccupancyRate réel.
 *
 * GET /api/stats/campus/:campusId/occupancy?academicYear=2024
 * Accès : admin, direction
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import Room from '../models/room.model';
import Schedule from '../models/schedule.model';
import { Op } from 'sequelize';

/**
 * GET /api/stats/campus/:campusId/occupancy
 * Calcule le taux d'occupation des salles d'un campus :
 *   – totalRooms    : salles disponibles sur le campus
 *   – totalSlots    : créneaux théoriques (salles × jours × semaine type)
 *   – occupiedSlots : créneaux actifs planifiés
 *   – occupancyRate : % d'occupation réel
 */
export async function getCampusOccupancy(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId } = req.params;
    const { academicYear } = req.query as { academicYear?: string };
    const year = academicYear ? parseInt(academicYear, 10) : new Date().getFullYear();

    // Salles disponibles sur le campus
    const rooms = await Room.findAll({
      where: { campusId, status: 'available' },
      attributes: ['id'],
    });

    const roomIds = rooms.map((r) => r.id);
    const totalRooms = roomIds.length;

    if (totalRooms === 0) {
      res.status(200).json({
        status: 'success',
        data: {
          campusId,
          academicYear: year,
          totalRooms: 0,
          occupiedSlots: 0,
          totalSlots: 0,
          occupancyRate: 0,
        },
      });
      return;
    }

    // Créneaux actifs planifiés dans ces salles pour l'année académique
    const occupiedSlots = await Schedule.count({
      where: {
        roomId: { [Op.in]: roomIds },
        academicYear: year,
        status: 'active',
      },
    });

    // Créneaux théoriques : chaque salle peut accueillir 5 jours × 3 créneaux/jour
    // soit 15 créneaux/semaine. Sur 30 semaines actives en moyenne = 450 créneaux/an.
    // Ajustable via la configuration globale.
    const SLOTS_PER_ROOM_PER_YEAR = 450;
    const totalSlots = totalRooms * SLOTS_PER_ROOM_PER_YEAR;

    const occupancyRate =
      totalSlots > 0
        ? Math.round((occupiedSlots / totalSlots) * 100 * 100) / 100
        : 0;

    res.status(200).json({
      status: 'success',
      data: {
        campusId,
        academicYear: year,
        totalRooms,
        occupiedSlots,
        totalSlots,
        occupancyRate,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'failure',
      code: 'ERR_OCCUPANCY_STATS',
      message: (err as Error).message,
    });
  }
}
