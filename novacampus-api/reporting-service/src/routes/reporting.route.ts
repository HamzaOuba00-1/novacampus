/**
 * routes/reporting.route.ts
 * ---------------------------------------------------------------
 * Définition complète des routes du service reporting / IA.
 *
 * Accès :
 *   – direction : tous les KPIs, rapports, IA, exports
 *   – admin     : rapports opérationnels, alertes IA, étudiants à risque
 *
 * Préfixe dans index.ts : /api
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as C from '../controllers/reporting.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import {
  validateExportRequest,
  validateUpdateAlert,
  validateAnalyzeRequest,
} from '../middlewares/validation.middleware';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════
// DASHBOARD DIRECTION
// ═══════════════════════════════════════════════

/**
 * GET /api/kpis/dashboard
 * Dashboard complet direction (tous campus, toutes métriques)
 * Query : ?academicYear=2024
 * Accès : direction
 */
router.get('/kpis/dashboard', requireRole('direction'), C.getDirectionDashboard);

// ═══════════════════════════════════════════════
// KPIs PAR CAMPUS
// Routes fixes avant paramétrées
// ═══════════════════════════════════════════════

/**
 * GET /api/kpis/programs
 * KPIs par programme / filière
 * Query : ?campusId=&academicYear=2024
 * Accès : admin, direction
 */
router.get('/kpis/programs', requireRole('admin', 'direction'), C.getKpisByProgram);

/**
 * GET /api/kpis/rooms/occupancy
 * Taux d'occupation des salles par campus
 * Query : ?campusId=&academicYear=2024
 * Accès : admin, direction
 */
router.get('/kpis/rooms/occupancy', requireRole('admin', 'direction'), C.getRoomOccupancy);

/**
 * GET /api/kpis/campuses
 * KPIs consolidés de tous les campus
 * Query : ?academicYear=2024&semester=1&refresh=true
 * Accès : direction
 */
router.get('/kpis/campuses', requireRole('direction'), C.getAllCampusKpis);

/**
 * GET /api/kpis/campuses/:id
 * KPIs d'un campus spécifique avec historique
 * Query : ?academicYear=2024&semester=1
 * Accès : admin, direction
 */
router.get('/kpis/campuses/:id', requireRole('admin', 'direction'), C.getCampusKpi);

// ═══════════════════════════════════════════════
// RAPPORTS OPÉRATIONNELS
// ═══════════════════════════════════════════════

/**
 * GET /api/reports/attendance
 * Rapport de présence par campus/cours
 * Query : ?campusId=&academicYear=2024
 * Accès : admin, direction
 */
router.get('/reports/attendance', requireRole('admin', 'direction'), C.getAttendanceReport);

/**
 * GET /api/reports/at-risk-students
 * Étudiants à risque détectés par l'IA
 * Query : ?campusId=&limit=20
 * Accès : admin, direction
 */
router.get('/reports/at-risk-students', requireRole('admin', 'direction'), C.getAtRiskStudents);

// ═══════════════════════════════════════════════
// EXPORT ASYNC – routes fixes avant /:jobId
// ═══════════════════════════════════════════════

/**
 * POST /api/reports/export
 * Créer un job d'export CSV ou JSON
 * Body : { reportType, format?, campusId?, academicYear? }
 * Retourne immédiatement { jobId, status: 'pending' }
 * Accès : admin, direction
 */
router.post('/reports/export', requireRole('admin', 'direction'), validateExportRequest, C.createExport);

/**
 * GET /api/reports/export/:jobId
 * Statut d'un job d'export + lien de téléchargement si prêt
 * Accès : admin, direction
 */
router.get('/reports/export/:jobId', requireRole('admin', 'direction'), C.getExportStatus);

/**
 * GET /api/reports/export/:jobId/download
 * Télécharger le fichier d'un export prêt
 * Accès : admin, direction
 */
router.get('/reports/export/:jobId/download', requireRole('admin', 'direction'), C.downloadExport);

// ═══════════════════════════════════════════════
// AGENT IA – routes fixes avant /:id
// ═══════════════════════════════════════════════

/**
 * GET /api/ai/alerts/stats
 * Statistiques des alertes (compteurs par type/sévérité)
 * Query : ?campusId=
 * Accès : admin, direction
 */
router.get('/ai/alerts/stats', requireRole('admin', 'direction'), C.getAlertStats);

/**
 * GET /api/ai/insights
 * Synthèse narrative générée par l'agent IA pour la direction
 * Query : ?campusId=&academicYear=2024
 * Accès : direction
 */
router.get('/ai/insights', requireRole('direction'), C.getInsights);

/**
 * POST /api/ai/analyze
 * Déclencher une analyse IA manuelle
 * Body : { scope: 'campus'|'global', targetId? }
 * Retourne 202 Accepted (traitement async)
 * Accès : direction, admin
 */
router.post('/ai/analyze', requireRole('direction', 'admin'), validateAnalyzeRequest, C.triggerAnalysis);

/**
 * GET /api/ai/alerts
 * Liste des alertes IA avec filtres
 * Query : ?status=open&type=dropout_risk&severity=high&campusId=
 * Accès : admin, direction
 */
router.get('/ai/alerts', requireRole('admin', 'direction'), C.listAlerts);

/**
 * GET /api/ai/alerts/:id
 * Détail d'une alerte IA
 * Accès : admin, direction
 */
router.get('/ai/alerts/:id', requireRole('admin', 'direction'), C.getAlertById);

/**
 * PATCH /api/ai/alerts/:id
 * Traiter une alerte (actioned ou dismissed)
 * Body : { status: 'actioned'|'dismissed', note? }
 * Accès : admin
 */
router.patch('/ai/alerts/:id', requireRole('admin'), validateUpdateAlert, C.updateAlert);

export default router;
