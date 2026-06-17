/**
 * controllers/reporting.controller.ts
 * ---------------------------------------------------------------
 * Contrôleurs pour toutes les ressources du service reporting/IA.
 *
 * Organisation :
 *   – KPIs      : dashboard direction, campus, programmes
 *   – Rapports  : présence, réussite, revenus, occupation
 *   – Agent IA  : alertes, analyse manuelle, insights
 *   – Export    : génération async CSV/JSON + téléchargement
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import fs from 'fs';
import { AuthenticatedRequest } from '../types';
import * as KpiService from '../services/kpi.service';
import * as AiAlertService from '../services/aiAlert.service';
import * as ExportService from '../services/export.service';

// ═══════════════════════════════════════════════
// KPIs DIRECTION
// ═══════════════════════════════════════════════

/** GET /api/kpis/campuses – KPIs consolidés tous campus */
export async function getAllCampusKpis(req: AuthenticatedRequest, res: Response) {
  try {
    const { academicYear, semester, refresh } = req.query as Record<string, string>;
    const year = parseInt(academicYear ?? String(new Date().getFullYear()), 10);
    const result = await KpiService.getAllCampusKpis(
      year,
      semester ? parseInt(semester, 10) : undefined,
      refresh === 'true'
    );
    res.status(200).json({ status: 'success', data: { kpis: result } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_KPI_ALL', message: (err as Error).message });
  }
}

/** GET /api/kpis/campuses/:id – KPIs d'un campus */
export async function getCampusKpi(req: AuthenticatedRequest, res: Response) {
  try {
    const { academicYear, semester } = req.query as Record<string, string>;
    const year = parseInt(academicYear ?? String(new Date().getFullYear()), 10);
    const kpi = await KpiService.getKpiForCampus(
      req.params.id,
      year,
      semester ? parseInt(semester, 10) : undefined
    );
    res.status(200).json({ status: 'success', data: kpi });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_KPI_CAMPUS', message: (err as Error).message });
  }
}

/** GET /api/kpis/programs – KPIs par programme */
export async function getKpisByProgram(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId, academicYear } = req.query as Record<string, string>;
    const year = parseInt(academicYear ?? String(new Date().getFullYear()), 10);
    const data = await KpiService.getKpisByProgram(campusId ?? '', year);
    res.status(200).json({ status: 'success', data: { programs: data } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_KPI_PROGRAMS', message: (err as Error).message });
  }
}

/** GET /api/kpis/rooms/occupancy – Taux d'occupation des salles */
export async function getRoomOccupancy(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId, academicYear } = req.query as Record<string, string>;
    // Simulation – en prod : appel planning-service
    res.status(200).json({
      status: 'success',
      data: {
        campusId: campusId ?? 'ALL',
        academicYear: parseInt(academicYear ?? '2024', 10),
        totalRooms: 25,
        occupiedSlots: 312,
        totalSlots: 480,
        occupancyRate: 65.0,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_ROOM_OCCUPANCY', message: (err as Error).message });
  }
}

/** GET /api/kpis/dashboard – Dashboard direction complet */
export async function getDirectionDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    const { academicYear } = req.query as Record<string, string>;
    const year = parseInt(academicYear ?? String(new Date().getFullYear()), 10);
    const dashboard = await KpiService.buildDirectionDashboard(year);
    // Enrichir avec le nombre d'alertes ouvertes
    const alertStats = await AiAlertService.getAlertStats();
    dashboard.totals.openAlerts = alertStats.open;
    res.status(200).json({ status: 'success', data: dashboard });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_DASHBOARD', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// RAPPORTS
// ═══════════════════════════════════════════════

/** GET /api/reports/attendance – Rapport de présence */
export async function getAttendanceReport(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId, academicYear } = req.query as Record<string, string>;
    // Simulation – en prod : appel academic-service
    res.status(200).json({
      status: 'success',
      data: {
        campusId,
        academicYear: parseInt(academicYear ?? '2024', 10),
        avgAttendanceRate: 81.2,
        atRiskStudents: 14,
        totalStudents: 120,
        byCourse: [
          { courseCode: 'COM101', avgRate: 88.5, atRiskCount: 2 },
          { courseCode: 'INFO101', avgRate: 79.0, atRiskCount: 5 },
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_ATTENDANCE_REPORT', message: (err as Error).message });
  }
}

/** GET /api/reports/at-risk-students – Étudiants à risque */
export async function getAtRiskStudents(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId, limit } = req.query as Record<string, string>;
    const students = await AiAlertService.getAtRiskStudents(
      campusId,
      parseInt(limit ?? '20', 10)
    );
    res.status(200).json({ status: 'success', data: { students } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_AT_RISK', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// AGENT IA
// ═══════════════════════════════════════════════

/** GET /api/ai/alerts – Liste des alertes IA */
export async function listAlerts(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await AiAlertService.listAlerts(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_ALERTS', message: (err as Error).message });
  }
}

/** GET /api/ai/alerts/:id – Détail d'une alerte */
export async function getAlertById(req: AuthenticatedRequest, res: Response) {
  try {
    const alert = await AiAlertService.getAlertById(req.params.id);
    res.status(200).json({ status: 'success', data: alert });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_ALERT_NOT_FOUND', message: (err as Error).message });
  }
}

/** PATCH /api/ai/alerts/:id – Traiter une alerte (actioned/dismissed) */
export async function updateAlert(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, note } = req.body;
    const alert = await AiAlertService.updateAlertStatus(
      req.params.id,
      req.user!.id,
      status,
      note
    );
    res.status(200).json({ status: 'success', data: alert });
  } catch (err) {
    const httpStatus = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(httpStatus).json({ status: 'failure', code: 'ERR_UPDATE_ALERT', message: (err as Error).message });
  }
}

/** POST /api/ai/analyze – Déclencher une analyse IA */
export async function triggerAnalysis(req: AuthenticatedRequest, res: Response) {
  try {
    const { scope, targetId } = req.body;
    // L'analyse peut prendre du temps – réponse pending + résultat inclus
    res.status(202).json({
      status: 'pending',
      message: 'Analyse IA démarrée. Les résultats seront disponibles dans quelques instants.',
    });

    // Traitement en arrière-plan
    setImmediate(async () => {
      const result = await AiAlertService.triggerAnalysis(scope, req.user!.id, targetId);
      console.log('[IA] Analyse terminée:', result);
    });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_ANALYZE', message: (err as Error).message });
  }
}

/** GET /api/ai/insights – Synthèse narrative IA pour la direction */
export async function getInsights(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId, academicYear } = req.query as Record<string, string>;
    const year = parseInt(academicYear ?? String(new Date().getFullYear()), 10);
    const summary = await AiAlertService.getInsightsSummary(campusId ?? null, year);
    const stats = await AiAlertService.getAlertStats(campusId);
    res.status(200).json({
      status: 'success',
      data: { summary, alertStats: stats },
    });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_INSIGHTS', message: (err as Error).message });
  }
}

/** GET /api/ai/alerts/stats – Statistiques des alertes */
export async function getAlertStats(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId } = req.query as { campusId?: string };
    const stats = await AiAlertService.getAlertStats(campusId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_ALERT_STATS', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════

/** POST /api/reports/export – Créer un job d'export */
export async function createExport(req: AuthenticatedRequest, res: Response) {
  try {
    const { reportType, format = 'csv', ...filters } = req.body;
    const result = await ExportService.createExportJob(
      req.user!.id,
      reportType,
      format,
      filters
    );
    res.status(202).json({
      status: 'pending',
      data: result,
      message: 'Export en cours de génération. Vérifiez le statut avec GET /api/reports/export/:jobId',
    });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_EXPORT', message: (err as Error).message });
  }
}

/** GET /api/reports/export/:jobId – Statut d'un job d'export */
export async function getExportStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const job = await ExportService.getExportJobStatus(req.params.jobId);
    res.status(200).json({ status: 'success', data: job });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_EXPORT_STATUS', message: (err as Error).message });
  }
}

/** GET /api/reports/export/:jobId/download – Télécharger un export */
export async function downloadExport(req: AuthenticatedRequest, res: Response) {
  try {
    const file = await ExportService.getExportFile(req.params.jobId);
    if (!file) {
      res.status(404).json({ status: 'failure', code: 'ERR_EXPORT_NOT_READY', message: 'Export introuvable ou non prêt.' });
      return;
    }
    const mimeType = file.format === 'csv' ? 'text/csv' : 'application/json';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.reportType}-export.${file.format}"`);
    fs.createReadStream(file.filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_DOWNLOAD', message: (err as Error).message });
  }
}
