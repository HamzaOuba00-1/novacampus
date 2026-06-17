/**
 * routes/campus.route.ts
 * ---------------------------------------------------------------
 * Définition complète des routes du service campus / admin.
 *
 * Toutes les routes nécessitent une authentification.
 * Les routes de modification sont réservées à direction/admin.
 * L'audit log en lecture est accessible à direction uniquement.
 *
 * Préfixe dans index.ts : /api
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as C from '../controllers/campus.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import {
  validateCreateCampus,
  validateUpdateCampus,
  validateCreateAcademicYear,
  validateCreateAuditLog,
  validateUpsertConfig,
} from '../middlewares/validation.middleware';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════
// CAMPUSES – /api/campuses
// ═══════════════════════════════════════════════

/**
 * GET /api/campuses
 * Liste tous les campus
 * Query : ?status=active&city=Paris&search=lyon
 * Accès : admin, direction
 */
router.get('/campuses', requireRole('admin', 'direction'), C.listCampuses);

/**
 * GET /api/campuses/:id
 * Détail d'un campus
 * Accès : admin, direction
 */
router.get('/campuses/:id', requireRole('admin', 'direction'), C.getCampusById);

/**
 * POST /api/campuses
 * Créer un campus + audit log automatique
 * Accès : direction uniquement
 */
router.post('/campuses', requireRole('direction'), validateCreateCampus, C.createCampus);

/**
 * PUT /api/campuses/:id
 * Modifier un campus + audit log avant/après
 * Accès : direction uniquement
 */
router.put('/campuses/:id', requireRole('direction'), validateUpdateCampus, C.updateCampus);

/**
 * PATCH /api/campuses/:id/archive
 * Archiver un campus (soft delete)
 * Accès : direction uniquement
 */
router.patch('/campuses/:id/archive', requireRole('direction'), C.archiveCampus);

// ═══════════════════════════════════════════════
// ANNÉES ACADÉMIQUES – /api/academic-years
// ═══════════════════════════════════════════════

/**
 * GET /api/academic-years
 * Liste toutes les années académiques
 * Accès : tous les rôles (information publique interne)
 */
router.get('/academic-years', C.listAcademicYears);

/**
 * GET /api/academic-years/current
 * Année et semestre courants
 * Accès : tous les rôles
 */
router.get('/academic-years/current', C.getCurrentAcademicYear);

/**
 * POST /api/academic-years
 * Créer une nouvelle année académique
 * Body : { year, s1Start, s1End, s2Start, s2End }
 * Accès : direction uniquement
 */
router.post(
  '/academic-years',
  requireRole('direction'),
  validateCreateAcademicYear,
  C.createAcademicYear
);

/**
 * PATCH /api/academic-years/:year/current
 * Définir l'année courante (transaction atomique)
 * Accès : direction uniquement
 */
router.patch('/academic-years/:year/current', requireRole('direction'), C.setCurrentYear);

// ═══════════════════════════════════════════════
// AUDIT LOG – /api/audit-logs
// ═══════════════════════════════════════════════

/**
 * GET /api/audit-logs
 * Liste paginée des entrées d'audit avec filtres
 * Query : ?actorId=&action=grade.create&entityType=Grade
 *         &campusId=&dateFrom=2024-01-01&dateTo=2024-01-31
 * Accès : direction uniquement
 */
router.get('/audit-logs', requireRole('direction'), C.listAuditLogs);

/**
 * GET /api/audit-logs/stats
 * Statistiques d'activité des 30 derniers jours
 * Query : ?campusId=
 * Accès : admin, direction
 */
router.get('/audit-logs/stats', requireRole('admin', 'direction'), C.getAuditStats);

/**
 * GET /api/audit-logs/:entityType/:entityId
 * Historique complet d'une entité précise
 * Ex : GET /api/audit-logs/Grade/uuid-de-la-note
 * Accès : admin, direction
 */
router.get('/audit-logs/:entityType/:entityId', requireRole('admin', 'direction'), C.getEntityHistory);

/**
 * POST /api/audit/log
 * Créer une entrée d'audit (appelé par les autres microservices)
 * Body : { actorId, action, entityType, entityId?, beforeState?, afterState?, campusId? }
 * Accès : admin (en prod : utiliser un token de service interne)
 */
router.post('/audit/log', requireRole('admin'), validateCreateAuditLog, C.createAuditLog);

// ═══════════════════════════════════════════════
// CONFIGURATION GLOBALE – /api/config
// ═══════════════════════════════════════════════

/**
 * GET /api/config
 * Liste toutes les configurations
 * Query : ?campusId= (pour obtenir les surcharges campus)
 * Accès : admin, direction
 */
router.get('/config', requireRole('admin', 'direction'), C.listConfigs);

/**
 * GET /api/config/:key
 * Valeur d'une clé de configuration
 * Query : ?campusId=
 * Accès : admin, direction
 */
router.get('/config/:key', requireRole('admin', 'direction'), C.getConfigValue);

/**
 * PUT /api/config
 * Créer ou mettre à jour une configuration (upsert)
 * Body : { key, value, description?, campusId? }
 * Accès : direction uniquement
 */
router.put('/config', requireRole('direction'), validateUpsertConfig, C.upsertConfig);

/**
 * DELETE /api/config/:key/:campusId
 * Supprimer une surcharge campus (la valeur globale reprend effet)
 * Accès : direction uniquement
 */
router.delete('/config/:key/:campusId', requireRole('direction'), C.deleteConfig);

export default router;
