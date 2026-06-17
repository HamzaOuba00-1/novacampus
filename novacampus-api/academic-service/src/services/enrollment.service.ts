/**
 * services/enrollment.service.ts
 * ---------------------------------------------------------------
 * AJOUT : getEnrollmentsByCourse()
 *   Retourne la liste des étudiants inscrits à un cours.
 *   Utilisé par SlotDetailInstructor pour la saisie des absences.
 *   Route : GET /api/courses/:courseId/enrollments
 * ---------------------------------------------------------------
 */

import Enrollment from '../models/enrollment.model';
import AcademicRecord from '../models/academicRecord.model';
import Course from '../models/course.model';
import { EnrollmentStatus, AcademicRecordResult } from '../types';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';

// ───────────────────────────────────────────────
// INSCRIPTIONS AUX COURS
// ───────────────────────────────────────────────

/**
 * Retourne les inscriptions d'un étudiant.
 */
export async function getEnrollmentsByStudent(
  studentId: string,
  query: Record<string, string>
) {
  const { academicYear, semester, status, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: Record<string, unknown> = { studentId };
  if (academicYear) where['academicYear'] = parseInt(academicYear, 10);
  if (semester) where['semester'] = parseInt(semester, 10);
  if (status) where['status'] = status as EnrollmentStatus;

  const { count, rows } = await Enrollment.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['academicYear', 'DESC'], ['semester', 'DESC']],
  });

  return { enrollments: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * NOUVEAU – Retourne les inscriptions actives à un cours.
 * Utilisé par l'enseignant pour voir la liste de ses étudiants
 * avant de saisir les absences via SlotDetailInstructor.
 *
 * Route : GET /api/courses/:courseId/enrollments
 * Accès : instructor, admin
 *
 * @param courseId    - UUID du cours
 * @param statusFilter - 'enrolled' (défaut) | 'all'
 */
export async function getEnrollmentsByCourse(
  courseId: string,
  statusFilter: string = 'enrolled'
) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new Error('Cours introuvable.');

  const where: Record<string, unknown> = { courseId };
  // Par défaut : seulement les inscrits actifs (pas les withdrawn ou failed)
  if (statusFilter !== 'all') {
    where['status'] = statusFilter as EnrollmentStatus;
  }

  return Enrollment.findAll({
    where,
    order: [['enrolledAt', 'ASC']],
    attributes: [
      'id',           // enrollmentId – utilisé pour POST absences
      'studentId',    // userId de l'étudiant dans auth-service
      'status',
      'attendanceRate',
      'finalGrade',
      'academicYear',
      'semester',
    ],
  });
}

/**
 * Inscrit un étudiant à un cours.
 */
export async function createEnrollment(data: {
  studentId: string;
  courseId: string;
  academicYear: number;
  semester: number;
}) {
  const course = await Course.findByPk(data.courseId);
  if (!course) throw new Error('Cours introuvable.');
  if (course.status === 'archived') throw new Error('Ce cours est archivé.');

  const existing = await Enrollment.findOne({
    where: {
      studentId: data.studentId,
      courseId: data.courseId,
      academicYear: data.academicYear,
      semester: data.semester,
    },
  });
  if (existing) throw new Error('L\'étudiant est déjà inscrit à ce cours pour cette période.');

  return Enrollment.create(data);
}

/**
 * Met à jour le statut d'une inscription.
 */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  status: EnrollmentStatus,
  finalGrade?: number
) {
  const enrollment = await Enrollment.findByPk(enrollmentId);
  if (!enrollment) throw new Error('Inscription introuvable.');

  const updates: Record<string, unknown> = { status };
  if (['validated', 'failed'].includes(status)) {
    updates['validatedAt'] = new Date();
    if (finalGrade !== undefined) updates['finalGrade'] = finalGrade;
  }

  return enrollment.update(updates);
}

// ───────────────────────────────────────────────
// HISTORIQUE ACADÉMIQUE
// ───────────────────────────────────────────────

export async function getAcademicRecordsByStudent(studentId: string) {
  return AcademicRecord.findAll({
    where: { studentId },
    order: [['academicYear', 'DESC']],
  });
}

export async function createAcademicRecord(data: {
  studentId: string;
  programId: string;
  academicYear: number;
  yearInProgram: number;
  result: AcademicRecordResult;
  gpa?: number;
  juryComment?: string;
}) {
  const existing = await AcademicRecord.findOne({
    where: { studentId: data.studentId, academicYear: data.academicYear },
  });
  if (existing) {
    throw new Error('Un bilan académique existe déjà pour cet étudiant sur cette année.');
  }

  let gpa = data.gpa ?? null;
  if (gpa === null) {
    const enrollments = await Enrollment.findAll({
      where: {
        studentId: data.studentId,
        academicYear: data.academicYear,
        status: ['validated', 'failed'],
      },
    });
    const gradesWithValues = enrollments.filter((e) => e.finalGrade !== null);
    if (gradesWithValues.length > 0) {
      const sum = gradesWithValues.reduce((acc, e) => acc + Number(e.finalGrade), 0);
      gpa = Math.round((sum / gradesWithValues.length) * 100) / 100;
    }
  }

  return AcademicRecord.create({
    studentId: data.studentId,
    programId: data.programId,
    academicYear: data.academicYear,
    yearInProgram: data.yearInProgram,
    result: data.result,
    gpa,
    juryComment: data.juryComment ?? null,
    validatedAt: new Date(),
  });
}
