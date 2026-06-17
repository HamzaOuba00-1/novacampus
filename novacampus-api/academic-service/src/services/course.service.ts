/**
 * services/course.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour la gestion des cours et des programmes.
 *
 * Couvre :
 *   – CRUD des programmes (filières)
 *   – CRUD des cours
 *   – Gestion des intervenants (CourseInstructor)
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import Course from '../models/course.model';
import Program from '../models/program.model';
import CourseInstructor from '../models/courseInstructor.model';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';
import { CourseStatus, ProgramType } from '../types';

// ───────────────────────────────────────────────
// PROGRAMMES
// ───────────────────────────────────────────────

/**
 * Liste les programmes avec filtres optionnels.
 */
export async function listPrograms(query: Record<string, string>) {
  const { campusId, type, status, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: WhereOptions = {};
  if (campusId) where['campusId'] = campusId;
  if (type) where['type'] = type as ProgramType;
  if (status) where['status'] = status;

  const { count, rows } = await Program.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['name', 'ASC']],
  });

  return { programs: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Récupère un programme par son identifiant.
 */
export async function getProgramById(id: string) {
  const program = await Program.findByPk(id);
  if (!program) throw new Error('Programme introuvable.');
  return program;
}

/**
 * Crée un nouveau programme.
 */
export async function createProgram(data: {
  campusId: string;
  coordinatorId?: string;
  name: string;
  type: ProgramType;
  department?: string;
  durationYears: number;
  annualTuition: number;
  maxStudents: number;
}) {
  return Program.create(data);
}

/**
 * Met à jour un programme existant.
 */
export async function updateProgram(id: string, data: Partial<{
  name: string;
  coordinatorId: string;
  department: string;
  annualTuition: number;
  maxStudents: number;
  status: 'active' | 'archived';
}>) {
  const program = await Program.findByPk(id);
  if (!program) throw new Error('Programme introuvable.');
  return program.update(data);
}

// ───────────────────────────────────────────────
// COURS
// ───────────────────────────────────────────────

/**
 * Liste les cours avec filtres (programme, semestre, année, statut).
 */
export async function listCourses(query: Record<string, string>) {
  const { programId, semester, status, search, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: WhereOptions = {};
  if (programId) where['programId'] = programId;
  if (semester) where['semester'] = parseInt(semester, 10);
  if (status) where['status'] = status as CourseStatus;
  if (search) where['name'] = { [Op.iLike]: `%${search}%` };

  const { count, rows } = await Course.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['semester', 'ASC'], ['name', 'ASC']],
  });

  return { courses: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Récupère un cours avec ses intervenants.
 */
export async function getCourseById(id: string) {
  const course = await Course.findByPk(id);
  if (!course) throw new Error('Cours introuvable.');

  // Récupération des intervenants liés au cours
  const instructors = await CourseInstructor.findAll({
    where: { courseId: id },
  });

  return { ...course.toJSON(), instructors };
}

/**
 * Crée un nouveau cours dans un programme existant.
 */
export async function createCourse(data: {
  programId: string;
  leadInstructorId?: string;
  code: string;
  name: string;
  semester: number;
  credits: number;
  hoursTotal: number;
  description?: string;
}) {
  // Vérification que le programme existe
  const program = await Program.findByPk(data.programId);
  if (!program) throw new Error('Programme introuvable.');

  // Vérification de l'unicité du code cours
  const existing = await Course.findOne({ where: { code: data.code } });
  if (existing) throw new Error(`Un cours avec le code "${data.code}" existe déjà.`);

  return Course.create(data);
}

/**
 * Met à jour un cours existant.
 */
export async function updateCourse(id: string, data: Partial<{
  name: string;
  leadInstructorId: string;
  semester: number;
  credits: number;
  hoursTotal: number;
  description: string;
  status: CourseStatus;
}>) {
  const course = await Course.findByPk(id);
  if (!course) throw new Error('Cours introuvable.');
  return course.update(data);
}

/**
 * Archive un cours (soft delete).
 */
export async function archiveCourse(id: string) {
  const course = await Course.findByPk(id);
  if (!course) throw new Error('Cours introuvable.');
  return course.update({ status: 'archived' });
}

/**
 * Ajoute un intervenant à un cours.
 */
export async function addInstructor(
  courseId: string,
  instructorId: string,
  role: 'lead' | 'assistant' | 'substitute' = 'assistant'
) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new Error('Cours introuvable.');

  const existing = await CourseInstructor.findOne({ where: { courseId, instructorId } });
  if (existing) throw new Error('Cet intervenant est déjà lié à ce cours.');

  return CourseInstructor.create({ courseId, instructorId, role });
}

/**
 * Retire un intervenant d'un cours.
 */
export async function removeInstructor(courseId: string, instructorId: string) {
  const deleted = await CourseInstructor.destroy({ where: { courseId, instructorId } });
  if (deleted === 0) throw new Error('Intervenant non trouvé sur ce cours.');
}
