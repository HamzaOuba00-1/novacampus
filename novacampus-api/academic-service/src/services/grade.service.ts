/**
 * services/grade.service.ts
 * ---------------------------------------------------------------
 * CORRECTIONS APPLIQUÉES :
 *   - createGrade() → notifie l'étudiant via notification-service
 *   - updateGrade() → notifie l'étudiant de la correction
 *
 * Pour notifier, il faut le userId de l'étudiant.
 * L'Enrollment stocke studentId (UUID inscription-service).
 * On suppose que studentId === userId (même UUID que auth-service).
 * Si les UUIDs diffèrent, ajouter un appel vers inscription-service.
 * ---------------------------------------------------------------
 */

import Grade from '../models/grade.model';
import Enrollment from '../models/enrollment.model';
import Course from '../models/course.model';
import {
  notifyGradeAdded,
  notifyGradeUpdated,
} from '../utils/serviceClient.util';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';

// ---------------------------------------------------------------
// Recalcul de la moyenne pondérée
// ---------------------------------------------------------------

async function recalculateFinalGrade(enrollmentId: string): Promise<void> {
  const grades = await Grade.findAll({ where: { enrollmentId } });
  if (grades.length === 0) return;

  const totalWeight  = grades.reduce((acc, g) => acc + Number(g.weight), 0);
  const weightedSum  = grades.reduce((acc, g) => acc + Number(g.value) * Number(g.weight), 0);
  const finalGrade   = totalWeight > 0 ? weightedSum / totalWeight : null;

  await Enrollment.update(
    { finalGrade: finalGrade !== null ? Math.round(finalGrade * 100) / 100 : null },
    { where: { id: enrollmentId } }
  );
}

// ---------------------------------------------------------------
// Consultation
// ---------------------------------------------------------------

export async function getGradesByEnrollment(
  enrollmentId: string,
  query: Record<string, string>
) {
  const enrollment = await Enrollment.findByPk(enrollmentId);
  if (!enrollment) throw new Error('Inscription introuvable.');

  const { page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const { count, rows } = await Grade.findAndCountAll({
    where: { enrollmentId },
    limit,
    offset: getOffset(page, limit),
    order: [['gradedAt', 'DESC']],
  });

  return { grades: rows, meta: buildPaginationMeta(count, page, limit) };
}

export async function getGradesByCourse(courseId: string) {
  const enrollments = await Enrollment.findAll({ where: { courseId } });
  const enrollmentIds = enrollments.map((e) => e.id);

  return Grade.findAll({
    where: { enrollmentId: enrollmentIds },
    order: [['enrollmentId', 'ASC'], ['gradedAt', 'DESC']],
  });
}

// ---------------------------------------------------------------
// CORRECTION : createGrade avec notification réelle
// ---------------------------------------------------------------

/**
 * Crée une note et notifie l'étudiant immédiatement.
 *
 * AVANT : recalcul de la moyenne + retour silencieux
 * APRÈS : recalcul + notification push/websocket à l'étudiant
 */
export async function createGrade(
  enrollmentId: string,
  instructorId: string,
  data: {
    label: string;
    value: number;
    weight?: number;
    comment?: string;
    gradedAt?: Date;
  }
) {
  const enrollment = await Enrollment.findByPk(enrollmentId);
  if (!enrollment) throw new Error('Inscription introuvable.');
  if (enrollment.status !== 'enrolled') {
    throw new Error('Impossible de saisir une note sur une inscription clôturée.');
  }

  const grade = await Grade.create({
    enrollmentId,
    instructorId,
    label: data.label,
    value: data.value,
    weight: data.weight ?? 1.0,
    comment: data.comment ?? null,
    gradedAt: data.gradedAt ?? new Date(),
  });

  // Recalcul de la moyenne
  await recalculateFinalGrade(enrollmentId);

  // CORRECTION : récupérer le code du cours pour la notification
  const course = await Course.findByPk(enrollment.courseId);
  const courseCode = course?.code ?? 'N/A';

  // CORRECTION : notifier l'étudiant (non bloquant)
  // studentId de l'enrollment = userId de l'étudiant dans auth-service
  notifyGradeAdded(
    enrollment.studentId, // userId dans auth-service
    courseCode,
    data.label,
    data.value
  ).catch(() => {
    // Erreur déjà loggée dans serviceClient
  });

  return grade;
}

// ---------------------------------------------------------------
// CORRECTION : updateGrade avec notification de correction
// ---------------------------------------------------------------

/**
 * Modifie une note et notifie l'étudiant de la correction.
 *
 * AVANT : mise à jour + recalcul silencieux
 * APRÈS : mise à jour + recalcul + notification push/websocket
 */
export async function updateGrade(
  gradeId: string,
  instructorId: string,
  data: Partial<{ label: string; value: number; weight: number; comment: string }>
) {
  const grade = await Grade.findByPk(gradeId);
  if (!grade) throw new Error('Note introuvable.');

  if (grade.instructorId !== instructorId) {
    throw new Error('Vous ne pouvez modifier que vos propres saisies.');
  }

  const oldValue = Number(grade.value);
  await grade.update(data);
  await recalculateFinalGrade(grade.enrollmentId);

  // CORRECTION : notifier si la valeur a changé
  if (data.value !== undefined && data.value !== oldValue) {
    const enrollment = await Enrollment.findByPk(grade.enrollmentId);
    if (enrollment) {
      const course = await Course.findByPk(enrollment.courseId);
      const courseCode = course?.code ?? 'N/A';

      notifyGradeUpdated(
        enrollment.studentId,
        courseCode,
        grade.label,
        oldValue,
        data.value
      ).catch(() => {});
    }
  }

  return grade;
}

export async function deleteGrade(gradeId: string, instructorId: string) {
  const grade = await Grade.findByPk(gradeId);
  if (!grade) throw new Error('Note introuvable.');

  if (grade.instructorId !== instructorId) {
    throw new Error('Vous ne pouvez supprimer que vos propres saisies.');
  }

  const { enrollmentId } = grade;
  await grade.destroy();
  await recalculateFinalGrade(enrollmentId);
}
