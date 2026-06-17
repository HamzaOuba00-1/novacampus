/**
 * routes/inscription.route.ts
 * ---------------------------------------------------------------
 * Définition complète des routes du service inscriptions.
 *
 * Toutes les routes sont protégées par authenticate.
 * Préfixe dans index.ts : /api
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as C from '../controllers/inscription.controller';
import { authenticate, requireRole, requireOwnerOrStaff } from '../middlewares/auth.middleware';
import {
  validateCreateStudent,
  validateUpdateStudent,
  validateCreateInstructor,
  validateUpdateStatus,
  validateVerifyDocument,
} from '../middlewares/validation.middleware';
import { upload } from '../config/upload.config';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════
// STATISTIQUES – /api/students/stats
// Doit être définie AVANT /:id pour éviter la collision
// ═══════════════════════════════════════════════

/**
 * GET /api/students/stats
 * Compteurs par statut pour le tableau de bord admin
 * Query : ?campusId=
 * Accès : admin, direction
 */
router.get('/students/stats', requireRole('admin', 'direction'), C.getStudentStats);

// ═══════════════════════════════════════════════
// DOSSIER PERSONNEL – /api/students/me
// ═══════════════════════════════════════════════

/**
 * GET /api/students/me
 * Dossier complet de l'étudiant connecté (avec documents)
 * Accès : student
 */
router.get('/students/me', requireRole('student'), C.getMyProfile);

// ═══════════════════════════════════════════════
// ÉTUDIANTS – /api/students
// ═══════════════════════════════════════════════

/**
 * GET /api/students
 * Liste paginée des étudiants avec filtres
 * Query : ?campusId=&programId=&status=active&paymentStatus=overdue&search=dupont
 * Accès : instructor, admin, direction
 */
router.get('/students', requireRole('instructor', 'admin', 'direction'), C.listStudents);

/**
 * GET /api/students/:id
 * Dossier complet d'un étudiant (données + documents)
 * Accès : student (son propre), instructor, admin, direction
 */
router.get(
  '/students/:id',
  requireOwnerOrStaff((req) => req.params.id), // vérifié plus finement en service via userId
  C.getStudentById
);

/**
 * POST /api/students
 * Créer un dossier étudiant + génère le numéro étudiant auto
 * Accès : admin uniquement
 */
router.post('/students', requireRole('admin'), validateCreateStudent, C.createStudent);

/**
 * PUT /api/students/:id
 * Mettre à jour les données personnelles
 * Accès : admin uniquement
 */
router.put('/students/:id', requireRole('admin'), validateUpdateStudent, C.updateStudent);

/**
 * PATCH /api/students/:id/status
 * Changer le statut académique (actif, suspendu, diplômé, retiré)
 * Accès : admin uniquement
 */
router.patch('/students/:id/status', requireRole('admin'), validateUpdateStatus, C.updateStudentStatus);

/**
 * PATCH /api/students/:id/payment-status
 * Synchroniser le statut de paiement (appelé par le payment-service)
 * Accès : admin uniquement
 */
router.patch('/students/:id/payment-status', requireRole('admin'), C.syncPaymentStatus);

// ═══════════════════════════════════════════════
// DOCUMENTS – /api/students/:id/documents
// ═══════════════════════════════════════════════

/**
 * GET /api/students/:id/documents
 * Liste les pièces justificatives d'un dossier
 * Query : ?verificationStatus=pending
 * Accès : student (ses propres docs), admin
 */
router.get('/students/:id/documents', C.getDocuments);

/**
 * POST /api/students/:id/documents
 * Upload une pièce justificative (multipart/form-data)
 * Body : file + { type, label }
 * Accès : student (son propre dossier), admin
 */
router.post(
  '/students/:id/documents',
  upload.single('file'),
  C.uploadDocument
);

/**
 * PATCH /api/documents/:id/verify
 * Vérifier ou rejeter un document
 * Body : { verificationStatus: 'verified'|'rejected', rejectionReason? }
 * Accès : admin uniquement
 */
router.patch('/documents/:id/verify', requireRole('admin'), validateVerifyDocument, C.verifyDocument);

/**
 * DELETE /api/documents/:id
 * Supprimer un document et son fichier physique
 * Accès : student (ses propres docs non vérifiés), admin
 */
router.delete('/documents/:id', C.deleteDocument);

// ═══════════════════════════════════════════════
// ENSEIGNANTS – /api/instructors
// ═══════════════════════════════════════════════

/**
 * GET /api/instructors/me
 * Profil de l'enseignant connecté
 * Accès : instructor
 */
router.get('/instructors/me', requireRole('instructor'), C.getMyInstructorProfile);

/**
 * GET /api/instructors
 * Liste des enseignants avec filtres
 * Query : ?campusId=&department=&contractType=permanent
 * Accès : admin, direction
 */
router.get('/instructors', requireRole('admin', 'direction'), C.listInstructors);

/**
 * GET /api/instructors/:id
 * Profil d'un enseignant spécifique
 * Accès : admin, direction, instructor (son propre)
 */
router.get('/instructors/:id', requireRole('instructor', 'admin', 'direction'), C.getInstructorById);

/**
 * POST /api/instructors
 * Créer un profil enseignant
 * Accès : admin uniquement
 */
router.post('/instructors', requireRole('admin'), validateCreateInstructor, C.createInstructor);

/**
 * PUT /api/instructors/:id
 * Mettre à jour un profil enseignant
 * Accès : admin uniquement
 */
router.put('/instructors/:id', requireRole('admin'), C.updateInstructor);

/**
 * PATCH /api/instructors/:id/status
 * Activer ou désactiver un enseignant
 * Body : { status: 'active'|'inactive' }
 * Accès : admin uniquement
 */
router.patch('/instructors/:id/status', requireRole('admin'), C.setInstructorStatus);

export default router;
