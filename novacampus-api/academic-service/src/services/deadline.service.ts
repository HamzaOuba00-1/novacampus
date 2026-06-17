/**
 * services/deadline.service.ts
 * ---------------------------------------------------------------
 * CORRECTIONS APPLIQUÉES :
 *   - createDeadline() → notifie via serviceClient (plus de console.log)
 *   - updateDeadline() → notifie si dueAt change (plus de console.log)
 * ---------------------------------------------------------------
 */

import { Op } from 'sequelize';
import Deadline from '../models/deadline.model';
import Course from '../models/course.model';
import Enrollment from '../models/enrollment.model';
import {
  notifyDeadlineCreated,
  notifyDeadlineUpdated,
} from '../utils/serviceClient.util';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';
import { DeadlineType } from '../types';

/**
 * Deadlines à venir pour un étudiant donné.
 */
export async function getDeadlinesForStudent(studentId: string) {
  const enrollments = await Enrollment.findAll({
    where: { studentId, status: 'enrolled' },
  });

  const courseIds = enrollments.map((e) => e.courseId);
  if (courseIds.length === 0) return [];

  return Deadline.findAll({
    where: {
      courseId: courseIds,
      dueAt: { [Op.gte]: new Date() },
    },
    order: [['dueAt', 'ASC']],
  });
}

/**
 * Deadlines d'un cours avec pagination.
 */
export async function getDeadlinesByCourse(
  courseId: string,
  query: Record<string, string>
) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new Error('Cours introuvable.');

  const { upcoming, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: Record<string, unknown> = { courseId };
  if (upcoming === 'true') {
    where['dueAt'] = { [Op.gte]: new Date() };
  }

  const { count, rows } = await Deadline.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['dueAt', 'ASC']],
  });

  return { deadlines: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Crée une deadline et notifie les étudiants inscrits.
 * CORRECTION : notification réelle via notification-service (plus de console.log)
 */
export async function createDeadline(
  courseId: string,
  instructorId: string,
  data: {
    title: string;
    dueAt: Date;
    type: DeadlineType;
    description?: string;
  }
) {
  const course = await Course.findByPk(courseId);
  if (!course) throw new Error('Cours introuvable.');

  const deadline = await Deadline.create({
    courseId,
    createdBy: instructorId,
    title: data.title,
    dueAt: data.dueAt,
    type: data.type,
    description: data.description ?? null,
  });

  // Récupérer les étudiants inscrits actifs
  const enrollments = await Enrollment.findAll({
    where: { courseId, status: 'enrolled' },
  });

  const studentUserIds = enrollments.map((e) => e.studentId);

  // CORRECTION : notification réelle (non bloquante)
  notifyDeadlineCreated(
    studentUserIds,
    course.code,
    data.title,
    data.dueAt,
    deadline.id
  ).catch(() => {});

  return deadline;
}

/**
 * Modifie une deadline et notifie si la date change.
 * CORRECTION : notification réelle via notification-service (plus de console.log)
 */
export async function updateDeadline(
  deadlineId: string,
  data: Partial<{
    title: string;
    dueAt: Date;
    type: DeadlineType;
    description: string;
  }>
) {
  const deadline = await Deadline.findByPk(deadlineId);
  if (!deadline) throw new Error('Deadline introuvable.');

  const previousDueAt = new Date(deadline.dueAt);
  await deadline.update(data);

  // CORRECTION : notification si la date limite a changé
  if (data.dueAt && data.dueAt.getTime() !== previousDueAt.getTime()) {
    const course = await Course.findByPk(deadline.courseId);
    const enrollments = await Enrollment.findAll({
      where: { courseId: deadline.courseId, status: 'enrolled' },
    });

    const studentUserIds = enrollments.map((e) => e.studentId);

    notifyDeadlineUpdated(
      studentUserIds,
      course?.code ?? 'N/A',
      deadline.title,
      previousDueAt,
      data.dueAt,
      deadline.id
    ).catch(() => {});
  }

  return deadline;
}

export async function deleteDeadline(deadlineId: string) {
  const deadline = await Deadline.findByPk(deadlineId);
  if (!deadline) throw new Error('Deadline introuvable.');
  await deadline.destroy();
}
