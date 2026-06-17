/**
 * controllers/planning.controller.ts
 * ---------------------------------------------------------------
 * PATCH APPLIQUÉ sur getMySchedule :
 *   courseIds devient OPTIONNEL.
 *   Sans inscription-service, on passe [] → le service retourne
 *   tous les créneaux actifs filtrés par instructorId (enseignant)
 *   ou tous (étudiant). La page s'affiche sans dépendance externe.
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as RoomService from '../services/room.service';
import * as ScheduleService from '../services/schedule.service';
import * as ExceptionService from '../services/exception.service';
import * as ConflictService from '../services/conflict.service';

export async function listRooms(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await RoomService.listRooms(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_ROOMS', message: (err as Error).message });
  }
}

export async function getRoomById(req: AuthenticatedRequest, res: Response) {
  try {
    const room = await RoomService.getRoomById(req.params.id);
    res.status(200).json({ status: 'success', data: room });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_ROOM_NOT_FOUND', message: (err as Error).message });
  }
}

export async function createRoom(req: AuthenticatedRequest, res: Response) {
  try {
    const room = await RoomService.createRoom(req.body);
    res.status(201).json({ status: 'success', data: room });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_ROOM', message: (err as Error).message });
  }
}

export async function updateRoom(req: AuthenticatedRequest, res: Response) {
  try {
    const room = await RoomService.updateRoom(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: room });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_ROOM', message: (err as Error).message });
  }
}

export async function getRoomAvailability(req: AuthenticatedRequest, res: Response) {
  try {
    const { from, to } = req.query as { from: string; to: string };
    if (!from || !to) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Les paramètres "from" et "to" sont obligatoires (YYYY-MM-DD).' });
      return;
    }
    const result = await RoomService.getRoomAvailability(req.params.id, from, to);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_ROOM_AVAILABILITY', message: (err as Error).message });
  }
}

export async function upsertEquipment(req: AuthenticatedRequest, res: Response) {
  try {
    const { equipmentType, quantity } = req.body;
    if (!equipmentType) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Le champ "equipmentType" est obligatoire.' });
      return;
    }
    const result = await RoomService.upsertEquipment(req.params.id, equipmentType, quantity ?? 1);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_UPSERT_EQUIPMENT', message: (err as Error).message });
  }
}

export async function removeEquipment(req: AuthenticatedRequest, res: Response) {
  try {
    await RoomService.removeEquipment(req.params.id, req.params.equipmentType as any);
    res.status(200).json({ status: 'success', message: 'Équipement retiré.' });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_REMOVE_EQUIPMENT', message: (err as Error).message });
  }
}

export async function listSchedules(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await ScheduleService.listSchedules(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_SCHEDULES', message: (err as Error).message });
  }
}

export async function createSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await ScheduleService.createSchedule(req.body);
    res.status(201).json({
      status: 'success',
      data: result.schedule,
      ...(result.hasConflicts && {
        warning: `${result.conflicts} conflit(s) de salle détecté(s). Consultez /api/conflicts.`,
      }),
    });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_SCHEDULE', message: (err as Error).message });
  }
}

export async function updateSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const schedule = await ScheduleService.updateSchedule(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: schedule });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_SCHEDULE', message: (err as Error).message });
  }
}

export async function cancelSchedule(req: AuthenticatedRequest, res: Response) {
  try {
    await ScheduleService.cancelSchedule(req.params.id);
    res.status(200).json({ status: 'success', message: 'Créneau annulé.' });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_CANCEL_SCHEDULE', message: (err as Error).message });
  }
}

/**
 * GET /api/schedules/me?week=2024-W03[&courseIds=id1,id2]
 *
 * PATCH : courseIds est désormais OPTIONNEL.
 *   – Avec courseIds : filtre les créneaux sur ces cours (comportement original)
 *   – Sans courseIds : retourne tous les créneaux actifs du user
 *     (instructor → filtrés par instructorId, student → tous les actifs)
 */
export async function getMySchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const { week, courseIds } = req.query as { week?: string; courseIds?: string };

    if (!week) {
      res.status(400).json({
        status: 'failure',
        code: 'ERR_VALIDATION',
        message: 'Le paramètre "week" est obligatoire (ex: 2024-W03).',
      });
      return;
    }

    const ownerType: 'student' | 'instructor' =
      req.user!.role === 'instructor' ? 'instructor' : 'student';

    // courseIds optionnel – [] déclenche le fallback dans le service
    const ids = courseIds ? courseIds.split(',').filter(Boolean) : [];

    const slots = await ScheduleService.getScheduleForWeek(
      req.user!.id,
      ownerType,
      week,
      ids
    );

    res.status(200).json({ status: 'success', data: { week, slots } });
  } catch (err) {
    res.status(400).json({
      status: 'failure',
      code: 'ERR_GET_SCHEDULE',
      message: (err as Error).message,
    });
  }
}

export async function getExceptionsBySchedule(req: AuthenticatedRequest, res: Response) {
  try {
    const exceptions = await ExceptionService.getExceptionsBySchedule(req.params.id);
    res.status(200).json({ status: 'success', data: { exceptions } });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_GET_EXCEPTIONS', message: (err as Error).message });
  }
}

export async function createException(req: AuthenticatedRequest, res: Response) {
  try {
    const exception = await ExceptionService.createException(req.params.id, req.user!.id, req.body);
    res.status(201).json({ status: 'success', data: exception });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_EXCEPTION', message: (err as Error).message });
  }
}

export async function deleteException(req: AuthenticatedRequest, res: Response) {
  try {
    await ExceptionService.deleteException(req.params.exceptionId);
    res.status(200).json({ status: 'success', message: 'Exception supprimée.' });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_DELETE_EXCEPTION', message: (err as Error).message });
  }
}

export async function listConflicts(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await ConflictService.listConflicts(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_CONFLICTS', message: (err as Error).message });
  }
}

export async function resolveConflict(req: AuthenticatedRequest, res: Response) {
  try {
    const { status } = req.body;
    const conflict = await ConflictService.resolveConflict(req.params.id, status, req.user!.id);
    res.status(200).json({ status: 'success', data: conflict });
  } catch (err) {
    const httpStatus = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(httpStatus).json({ status: 'failure', code: 'ERR_RESOLVE_CONFLICT', message: (err as Error).message });
  }
}
