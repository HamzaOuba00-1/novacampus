/**
 * routes/academic.route.ts
 * ---------------------------------------------------------------
 * AJOUT : GET /api/courses/:courseId/enrollments
 *   Liste les étudiants inscrits à un cours.
 *   Utilisé par SlotDetailInstructor pour la saisie des absences.
 *   Accès : instructor, admin
 *
 * Tous les autres routes sont identiques à l'original.
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as C from '../controllers/academic.controller';
import { getEnrollmentsByCourse } from '../controllers/enrollmentsByCourse.controller';
import { getCampusStats } from '../controllers/stats.controller';
import { authenticate, requireRole, requireOwnerOrStaff } from '../middlewares/auth.middleware';
import {
  validateCreateProgram,
  validateCreateCourse,
  validateCreateGrade,
  validateCreateAbsences,
  validateCreateDeadline,
  validateCreateEnrollment,
  validateCreateAcademicRecord,
} from '../middlewares/validation.middleware';
import { upload } from '../config/upload.config';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════
// STATS AGRÉGÉES PAR CAMPUS (reporting-service)
// Route fixe avant toute route paramétrée /:id
// ═══════════════════════════════════════════════
router.get('/stats/campus/:campusId', requireRole('admin', 'direction'), getCampusStats);

// ═══════════════════════════════════════════════
// PROGRAMMES
// ═══════════════════════════════════════════════
router.get('/programs', C.listPrograms);
router.get('/programs/:id', C.getProgramById);
router.post('/programs', requireRole('admin', 'direction'), validateCreateProgram, C.createProgram);
router.put('/programs/:id', requireRole('admin'), C.updateProgram);

// ═══════════════════════════════════════════════
// COURS
// ═══════════════════════════════════════════════
router.get('/courses', C.listCourses);
router.get('/courses/:id', C.getCourseById);
router.post('/courses', requireRole('admin'), validateCreateCourse, C.createCourse);
router.put('/courses/:id', requireRole('instructor', 'admin'), C.updateCourse);
router.delete('/courses/:id', requireRole('admin'), C.archiveCourse);

// Intervenants
router.post('/courses/:id/instructors', requireRole('admin'), C.addInstructor);
router.delete('/courses/:id/instructors/:instructorId', requireRole('admin'), C.removeInstructor);

// Notes par cours (vue enseignant)
router.get('/courses/:id/grades', requireRole('instructor', 'admin'), C.getGradesByCourse);

// Deadlines
router.get('/courses/:courseId/deadlines', C.getDeadlinesByCourse);
router.post('/courses/:courseId/deadlines', requireRole('instructor', 'admin'), validateCreateDeadline, C.createDeadline);

// Ressources
router.get('/courses/:courseId/resources', C.getResourcesByCourse);
router.post('/courses/:courseId/resources/upload', requireRole('instructor', 'admin'), upload.single('file'), C.uploadResource);
router.post('/courses/:courseId/resources/link', requireRole('instructor', 'admin'), C.addLinkResource);

// NOUVEAU – Étudiants inscrits à un cours (pour saisie absences)
router.get(
  '/courses/:courseId/enrollments',
  requireRole('instructor', 'admin'),
  getEnrollmentsByCourse
);

// ═══════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════
router.get(
  '/enrollments/:enrollmentId/grades',
  requireOwnerOrStaff((req) => req.user?.id ?? ''),
  C.getGradesByEnrollment
);
router.post('/enrollments/:enrollmentId/grades', requireRole('instructor'), validateCreateGrade, C.createGrade);
router.patch('/grades/:gradeId', requireRole('instructor'), C.updateGrade);
router.delete('/grades/:gradeId', requireRole('instructor'), C.deleteGrade);

// ═══════════════════════════════════════════════
// ABSENCES
// ═══════════════════════════════════════════════
router.post('/schedules/:scheduleId/absences', requireRole('instructor'), validateCreateAbsences, C.recordAbsences);
router.get('/students/:studentId/absences', C.getAbsencesByStudent);
router.patch('/absences/:absenceId/justify', requireRole('admin'), C.justifyAbsence);

// ═══════════════════════════════════════════════
// DEADLINES
// ═══════════════════════════════════════════════
router.get('/students/me/deadlines', C.getDeadlinesForStudent);
router.patch('/deadlines/:deadlineId', requireRole('instructor', 'admin'), C.updateDeadline);
router.delete('/deadlines/:deadlineId', requireRole('instructor', 'admin'), C.deleteDeadline);

// ═══════════════════════════════════════════════
// RESSOURCES
// ═══════════════════════════════════════════════
router.patch('/resources/:resourceId/visibility', requireRole('instructor', 'admin'), C.toggleResourceVisibility);
router.delete('/resources/:resourceId', requireRole('instructor', 'admin'), C.deleteResource);

// ═══════════════════════════════════════════════
// INSCRIPTIONS
// ═══════════════════════════════════════════════
router.get('/students/:studentId/enrollments', C.getEnrollmentsByStudent);
router.post('/enrollments', requireRole('admin'), validateCreateEnrollment, C.createEnrollment);
router.patch('/enrollments/:enrollmentId/status', requireRole('admin'), C.updateEnrollmentStatus);

// ═══════════════════════════════════════════════
// HISTORIQUE ACADÉMIQUE
// ═══════════════════════════════════════════════
router.get('/students/:studentId/academic-records', C.getAcademicRecords);
router.post('/students/:studentId/academic-records', requireRole('admin'), validateCreateAcademicRecord, C.createAcademicRecord);

export default router;
