/**
 * controllers/campus.controller.ts
 * ---------------------------------------------------------------
 * Contrôleurs pour toutes les ressources du service campus/admin.
 *
 * Organisation :
 *   – Campuses      : CRUD + archivage
 *   – AcademicYears : référentiel + semestre courant
 *   – AuditLog      : consultation + historique entité + stats
 *   – GlobalConfig  : lecture et modification des paramètres
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as CampusService from '../services/campus.service';
import * as AcademicYearService from '../services/academicYear.service';
import * as AuditLogService from '../services/auditLog.service';
import * as ConfigService from '../services/globalConfig.service';

// ═══════════════════════════════════════════════
// CAMPUSES
// ═══════════════════════════════════════════════

export async function listCampuses(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await CampusService.listCampuses(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_CAMPUSES', message: (err as Error).message });
  }
}

export async function getCampusById(req: AuthenticatedRequest, res: Response) {
  try {
    const campus = await CampusService.getCampusById(req.params.id);
    res.status(200).json({ status: 'success', data: campus });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_CAMPUS_NOT_FOUND', message: (err as Error).message });
  }
}

export async function createCampus(req: AuthenticatedRequest, res: Response) {
  try {
    const campus = await CampusService.createCampus(
      req.body,
      req.user!.id,
      req.ip ?? undefined
    );
    res.status(201).json({ status: 'success', data: campus });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_CAMPUS', message: (err as Error).message });
  }
}

export async function updateCampus(req: AuthenticatedRequest, res: Response) {
  try {
    const campus = await CampusService.updateCampus(
      req.params.id,
      req.body,
      req.user!.id,
      req.ip ?? undefined
    );
    res.status(200).json({ status: 'success', data: campus });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_CAMPUS', message: (err as Error).message });
  }
}

export async function archiveCampus(req: AuthenticatedRequest, res: Response) {
  try {
    await CampusService.archiveCampus(req.params.id, req.user!.id, req.ip ?? undefined);
    res.status(200).json({ status: 'success', message: 'Campus archivé.' });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_ARCHIVE_CAMPUS', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// ANNÉES ACADÉMIQUES
// ═══════════════════════════════════════════════

export async function listAcademicYears(_req: AuthenticatedRequest, res: Response) {
  try {
    const years = await AcademicYearService.listAcademicYears();
    res.status(200).json({ status: 'success', data: { years } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_YEARS', message: (err as Error).message });
  }
}

export async function getCurrentAcademicYear(_req: AuthenticatedRequest, res: Response) {
  try {
    const year = await AcademicYearService.getCurrentAcademicYear();
    const semester = await AcademicYearService.getCurrentSemester();
    res.status(200).json({ status: 'success', data: { year, currentSemester: semester } });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_NO_CURRENT_YEAR', message: (err as Error).message });
  }
}

export async function createAcademicYear(req: AuthenticatedRequest, res: Response) {
  try {
    const { year, s1Start, s1End, s2Start, s2End } = req.body;
    const ay = await AcademicYearService.createAcademicYear(
      {
        year: parseInt(year, 10),
        s1Start: new Date(s1Start),
        s1End: new Date(s1End),
        s2Start: new Date(s2Start),
        s2End: new Date(s2End),
      },
      req.user!.id,
      req.ip ?? undefined
    );
    res.status(201).json({ status: 'success', data: ay });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_YEAR', message: (err as Error).message });
  }
}

export async function setCurrentYear(req: AuthenticatedRequest, res: Response) {
  try {
    const year = parseInt(req.params.year, 10);
    const ay = await AcademicYearService.setCurrentAcademicYear(year, req.user!.id, req.ip ?? undefined);
    res.status(200).json({ status: 'success', data: ay, message: `Année ${ay.label} définie comme courante.` });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_SET_CURRENT_YEAR', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════

export async function listAuditLogs(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await AuditLogService.listAuditLogs(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_AUDIT', message: (err as Error).message });
  }
}

export async function getEntityHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const { entityType, entityId } = req.params;
    const logs = await AuditLogService.getEntityHistory(entityType, entityId);
    res.status(200).json({ status: 'success', data: { logs } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_ENTITY_HISTORY', message: (err as Error).message });
  }
}

export async function createAuditLog(req: AuthenticatedRequest, res: Response) {
  try {
    const log = await AuditLogService.createAuditEntry({
      ...req.body,
      ipAddress: req.body.ipAddress ?? req.ip ?? null,
    });
    res.status(201).json({ status: 'success', data: log });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_AUDIT', message: (err as Error).message });
  }
}

export async function getAuditStats(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId } = req.query as { campusId?: string };
    const stats = await AuditLogService.getAuditStats(campusId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_AUDIT_STATS', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// CONFIGURATION GLOBALE
// ═══════════════════════════════════════════════

export async function listConfigs(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId } = req.query as { campusId?: string };
    const result = await ConfigService.listConfigs(campusId);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_CONFIG', message: (err as Error).message });
  }
}

export async function getConfigValue(req: AuthenticatedRequest, res: Response) {
  try {
    const { key } = req.params;
    const { campusId } = req.query as { campusId?: string };
    const value = await ConfigService.getConfigValue(key, campusId);
    res.status(200).json({ status: 'success', data: { key, value } });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_CONFIG_NOT_FOUND', message: (err as Error).message });
  }
}

export async function upsertConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const { key, value, description, campusId } = req.body;
    const result = await ConfigService.upsertConfig(key, value, req.user!.id, {
      description,
      campusId,
      ipAddress: req.ip ?? undefined,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_UPSERT_CONFIG', message: (err as Error).message });
  }
}

export async function deleteConfig(req: AuthenticatedRequest, res: Response) {
  try {
    const { key, campusId } = req.params;
    await ConfigService.deleteConfig(key, campusId, req.user!.id);
    res.status(200).json({ status: 'success', message: 'Configuration supprimée.' });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_DELETE_CONFIG', message: (err as Error).message });
  }
}
