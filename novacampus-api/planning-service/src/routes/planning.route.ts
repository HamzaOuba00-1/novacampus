/**
 * routes/planning.route.ts
 * ---------------------------------------------------------------
 * CORRECTION APPLIQUÉE :
 *   Ajout de GET /api/stats/campus/:campusId/occupancy
 *   Endpoint utilisé par le reporting-service pour roomOccupancyRate réel.
 *   Placé en PREMIER pour éviter toute collision avec les routes paramétrées.
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as C from '../controllers/planning.controller';
import { getCampusOccupancy } from '../controllers/stats.controller'; // NOUVEAU
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import {
  validateCreateRoom,
  validateCreateSchedule,
  validateCreateException,
  validateResolveConflict,
} from '../middlewares/validation.middleware';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════
// NOUVEAU – STATISTIQUES D'OCCUPATION PAR CAMPUS
// Route fixe avant toute route paramétrée
// ═══════════════════════════════════════════════

/**
 * GET /api/stats/campus/:campusId/occupancy
 * Taux d'occupation des salles d'un campus
 * Query : ?academicYear=2024
 * Accès : admin, direction
 */
router.get(
  '/stats/campus/:campusId/occupancy',
  requireRole('admin', 'direction'),
  getCampusOccupancy
);

// ═══════════════════════════════════════════════
// SALLES – /api/rooms
// ═══════════════════════════════════════════════

router.get('/rooms', requireRole('instructor', 'admin', 'direction'), C.listRooms);
router.get('/rooms/:id', requireRole('instructor', 'admin', 'direction'), C.getRoomById);
router.post('/rooms', requireRole('admin'), validateCreateRoom, C.createRoom);
router.patch('/rooms/:id', requireRole('admin'), C.updateRoom);
router.get('/rooms/:id/availability', requireRole('instructor', 'admin'), C.getRoomAvailability);
router.put('/rooms/:id/equipment', requireRole('admin'), C.upsertEquipment);
router.delete('/rooms/:id/equipment/:equipmentType', requireRole('admin'), C.removeEquipment);

// ═══════════════════════════════════════════════
// EMPLOI DU TEMPS PERSONNEL
// ═══════════════════════════════════════════════

router.get('/schedules/me', requireRole('student', 'instructor'), C.getMySchedule);

// ═══════════════════════════════════════════════
// CRÉNEAUX ADMIN
// ═══════════════════════════════════════════════

router.get('/schedules', requireRole('admin', 'direction'), C.listSchedules);
router.post('/schedules', requireRole('admin'), validateCreateSchedule, C.createSchedule);
router.put('/schedules/:id', requireRole('admin'), C.updateSchedule);
router.delete('/schedules/:id', requireRole('admin'), C.cancelSchedule);

// ═══════════════════════════════════════════════
// EXCEPTIONS
// ═══════════════════════════════════════════════

router.get('/schedules/:id/exceptions', requireRole('instructor', 'admin'), C.getExceptionsBySchedule);
router.post('/schedules/:id/exceptions', requireRole('admin'), validateCreateException, C.createException);
router.delete('/schedules/:id/exceptions/:exceptionId', requireRole('admin'), C.deleteException);

// ═══════════════════════════════════════════════
// CONFLITS
// ═══════════════════════════════════════════════

router.get('/conflicts', requireRole('admin', 'direction'), C.listConflicts);
router.patch('/conflicts/:id', requireRole('admin'), validateResolveConflict, C.resolveConflict);

export default router;
