/**
 * controllers/academic.controller.ts  [EXTRAIT – ajout uniquement]
 * ---------------------------------------------------------------
 * AJOUT : getEnrollmentsByCourse
 *   Handler pour GET /api/courses/:courseId/enrollments
 *   Retourne la liste des étudiants inscrits à un cours.
 *   Utilisé par SlotDetailInstructor pour charger la liste
 *   des étudiants avant la saisie d'absences.
 *
 * ⚠ Ce fichier contient UNIQUEMENT la nouvelle fonction à ajouter
 * à la fin de academic.controller.ts existant.
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as EnrollmentService from '../services/enrollment.service';

/**
 * GET /api/courses/:courseId/enrollments
 * Liste les étudiants inscrits à un cours (status=enrolled par défaut).
 * Query : ?status=enrolled|all
 * Accès : instructor, admin
 */
export async function getEnrollmentsByCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const { courseId } = req.params;
    const status = (req.query.status as string) ?? 'enrolled';

    const enrollments = await EnrollmentService.getEnrollmentsByCourse(courseId, status);

    res.status(200).json({
      status: 'success',
      data: { enrollments, total: enrollments.length },
    });
  } catch (err) {
    const httpStatus = (err as Error).message.includes('introuvable') ? 404 : 500;
    res.status(httpStatus).json({
      status: 'failure',
      code: 'ERR_GET_COURSE_ENROLLMENTS',
      message: (err as Error).message,
    });
  }
}
