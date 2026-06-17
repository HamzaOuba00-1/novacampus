/**
 * controllers/inscription.controller.ts
 * ---------------------------------------------------------------
 * Contrôleurs pour toutes les ressources du service inscriptions.
 *
 * Organisation :
 *   – Students    : CRUD dossiers étudiants + statut + stats
 *   – Instructors : CRUD profils enseignants
 *   – Documents   : upload, vérification, suppression
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { AuthenticatedRequest, DocumentType } from '../types';
import * as StudentService from '../services/student.service';
import * as InstructorService from '../services/instructor.service';
import * as DocumentService from '../services/document.service';

// ═══════════════════════════════════════════════
// ÉTUDIANTS
// ═══════════════════════════════════════════════

/** GET /api/students – Liste paginée avec filtres */
export async function listStudents(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await StudentService.listStudents(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_STUDENTS', message: (err as Error).message });
  }
}

/** GET /api/students/me – Dossier de l'étudiant connecté */
export async function getMyProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const student = await StudentService.getStudentByUserId(req.user!.id);
    res.status(200).json({ status: 'success', data: student });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_STUDENT_NOT_FOUND', message: (err as Error).message });
  }
}

/** GET /api/students/:id – Dossier complet d'un étudiant */
export async function getStudentById(req: AuthenticatedRequest, res: Response) {
  try {
    const student = await StudentService.getStudentById(req.params.id);
    res.status(200).json({ status: 'success', data: student });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_STUDENT_NOT_FOUND', message: (err as Error).message });
  }
}

/** POST /api/students – Créer un dossier étudiant */
export async function createStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const student = await StudentService.createStudent(req.body);
    res.status(201).json({ status: 'success', data: student });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_STUDENT', message: (err as Error).message });
  }
}

/** PUT /api/students/:id – Mettre à jour un dossier */
export async function updateStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const student = await StudentService.updateStudent(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: student });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_STUDENT', message: (err as Error).message });
  }
}

/** PATCH /api/students/:id/status – Changer le statut */
export async function updateStudentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const student = await StudentService.updateStudentStatus(req.params.id, req.body.status);
    res.status(200).json({ status: 'success', data: student });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_STATUS', message: (err as Error).message });
  }
}

/** PATCH /api/students/:id/payment-status – Sync paiement */
export async function syncPaymentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { paymentStatus } = req.body;
    if (!['up_to_date', 'pending', 'overdue'].includes(paymentStatus)) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'paymentStatus invalide.' });
      return;
    }
    const student = await StudentService.syncPaymentStatus(req.params.id, paymentStatus);
    res.status(200).json({ status: 'success', data: student });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_SYNC_PAYMENT', message: (err as Error).message });
  }
}

/** GET /api/students/stats – Statistiques tableau de bord */
export async function getStudentStats(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId } = req.query as { campusId?: string };
    const stats = await StudentService.getStudentStats(campusId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_STATS', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// ENSEIGNANTS
// ═══════════════════════════════════════════════

/** GET /api/instructors – Liste des enseignants */
export async function listInstructors(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await InstructorService.listInstructors(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_INSTRUCTORS', message: (err as Error).message });
  }
}

/** GET /api/instructors/me – Profil de l'enseignant connecté */
export async function getMyInstructorProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const instructor = await InstructorService.getInstructorByUserId(req.user!.id);
    res.status(200).json({ status: 'success', data: instructor });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_INSTRUCTOR_NOT_FOUND', message: (err as Error).message });
  }
}

/** GET /api/instructors/:id – Profil d'un enseignant */
export async function getInstructorById(req: AuthenticatedRequest, res: Response) {
  try {
    const instructor = await InstructorService.getInstructorById(req.params.id);
    res.status(200).json({ status: 'success', data: instructor });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_INSTRUCTOR_NOT_FOUND', message: (err as Error).message });
  }
}

/** POST /api/instructors – Créer un profil enseignant */
export async function createInstructor(req: AuthenticatedRequest, res: Response) {
  try {
    const instructor = await InstructorService.createInstructor(req.body);
    res.status(201).json({ status: 'success', data: instructor });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_INSTRUCTOR', message: (err as Error).message });
  }
}

/** PUT /api/instructors/:id – Modifier un profil enseignant */
export async function updateInstructor(req: AuthenticatedRequest, res: Response) {
  try {
    const instructor = await InstructorService.updateInstructor(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: instructor });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_INSTRUCTOR', message: (err as Error).message });
  }
}

/** PATCH /api/instructors/:id/status – Activer / désactiver */
export async function setInstructorStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Status doit être active ou inactive.' });
      return;
    }
    const instructor = await InstructorService.setInstructorStatus(req.params.id, status);
    res.status(200).json({ status: 'success', data: instructor });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_SET_STATUS', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════

/** GET /api/students/:id/documents – Documents d'un étudiant */
export async function getDocuments(req: AuthenticatedRequest, res: Response) {
  try {
    const { verificationStatus } = req.query as { verificationStatus?: string };
    const documents = await DocumentService.getDocumentsByStudent(
      req.params.id,
      verificationStatus as any
    );
    res.status(200).json({ status: 'success', data: { documents } });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_GET_DOCUMENTS', message: (err as Error).message });
  }
}

/** POST /api/students/:id/documents – Upload un document */
export async function uploadDocument(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ status: 'failure', code: 'ERR_NO_FILE', message: 'Aucun fichier reçu.' });
      return;
    }
    const { type, label } = req.body;
    if (!type || !label) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Les champs "type" et "label" sont obligatoires.' });
      return;
    }
    const document = await DocumentService.uploadDocument(
      req.params.id,
      req.user!.id,
      req.file,
      type as DocumentType,
      label
    );
    res.status(201).json({ status: 'success', data: document });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_UPLOAD_DOCUMENT', message: (err as Error).message });
  }
}

/** PATCH /api/documents/:id/verify – Vérifier ou rejeter un document */
export async function verifyDocument(req: AuthenticatedRequest, res: Response) {
  try {
    const { verificationStatus, rejectionReason } = req.body;
    const document = await DocumentService.verifyDocument(
      req.params.id,
      req.user!.id,
      verificationStatus,
      rejectionReason
    );
    res.status(200).json({ status: 'success', data: document });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_VERIFY_DOCUMENT', message: (err as Error).message });
  }
}

/** DELETE /api/documents/:id – Supprimer un document */
export async function deleteDocument(req: AuthenticatedRequest, res: Response) {
  try {
    const isAdmin = ['admin', 'direction'].includes(req.user!.role);
    await DocumentService.deleteDocument(req.params.id, req.user!.id, isAdmin);
    res.status(200).json({ status: 'success', message: 'Document supprimé.' });
  } catch (err) {
    const httpStatus = (err as Error).message.includes('introuvable') ? 404 : 403;
    res.status(httpStatus).json({ status: 'failure', code: 'ERR_DELETE_DOCUMENT', message: (err as Error).message });
  }
}
