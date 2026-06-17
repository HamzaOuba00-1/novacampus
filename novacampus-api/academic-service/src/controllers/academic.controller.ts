/**
 * controllers/academic.controller.ts
 * ---------------------------------------------------------------
 * Contrôleurs pour toutes les ressources du service académique.
 *
 * Organisation par domaine :
 *   – Programs   : gestion des filières
 *   – Courses    : CRUD des cours + intervenants
 *   – Grades     : saisie et consultation des notes
 *   – Absences   : enregistrement batch et justification
 *   – Deadlines  : gestion des échéances
 *   – Resources  : supports pédagogiques
 *   – Enrollments : inscriptions et historique académique
 *
 * Chaque handler suit le pattern :
 *   try { appel service → réponse normalisée } catch { code erreur }
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as CourseService from '../services/course.service';
import * as GradeService from '../services/grade.service';
import * as AbsenceService from '../services/absence.service';
import * as DeadlineService from '../services/deadline.service';
import * as ResourceService from '../services/resource.service';
import * as EnrollmentService from '../services/enrollment.service';

// ═══════════════════════════════════════════════
// PROGRAMMES
// ═══════════════════════════════════════════════

export async function listPrograms(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await CourseService.listPrograms(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_PROGRAMS', message: (err as Error).message });
  }
}

export async function getProgramById(req: AuthenticatedRequest, res: Response) {
  try {
    const program = await CourseService.getProgramById(req.params.id);
    res.status(200).json({ status: 'success', data: program });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_PROGRAM_NOT_FOUND', message: (err as Error).message });
  }
}

export async function createProgram(req: AuthenticatedRequest, res: Response) {
  try {
    const program = await CourseService.createProgram(req.body);
    res.status(201).json({ status: 'success', data: program });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_PROGRAM', message: (err as Error).message });
  }
}

export async function updateProgram(req: AuthenticatedRequest, res: Response) {
  try {
    const program = await CourseService.updateProgram(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: program });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_PROGRAM', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// COURS
// ═══════════════════════════════════════════════

export async function listCourses(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await CourseService.listCourses(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_COURSES', message: (err as Error).message });
  }
}

export async function getCourseById(req: AuthenticatedRequest, res: Response) {
  try {
    const course = await CourseService.getCourseById(req.params.id);
    res.status(200).json({ status: 'success', data: course });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_COURSE_NOT_FOUND', message: (err as Error).message });
  }
}

export async function createCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const course = await CourseService.createCourse(req.body);
    res.status(201).json({ status: 'success', data: course });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_COURSE', message: (err as Error).message });
  }
}

export async function updateCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const course = await CourseService.updateCourse(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: course });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_COURSE', message: (err as Error).message });
  }
}

export async function archiveCourse(req: AuthenticatedRequest, res: Response) {
  try {
    await CourseService.archiveCourse(req.params.id);
    res.status(200).json({ status: 'success', message: 'Cours archivé.' });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_ARCHIVE_COURSE', message: (err as Error).message });
  }
}

export async function addInstructor(req: AuthenticatedRequest, res: Response) {
  try {
    const { instructorId, role } = req.body;
    const result = await CourseService.addInstructor(req.params.id, instructorId, role);
    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_ADD_INSTRUCTOR', message: (err as Error).message });
  }
}

export async function removeInstructor(req: AuthenticatedRequest, res: Response) {
  try {
    await CourseService.removeInstructor(req.params.id, req.params.instructorId);
    res.status(200).json({ status: 'success', message: 'Intervenant retiré du cours.' });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_REMOVE_INSTRUCTOR', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════

export async function getGradesByEnrollment(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await GradeService.getGradesByEnrollment(req.params.enrollmentId, req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_GET_GRADES', message: (err as Error).message });
  }
}

export async function getGradesByCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const grades = await GradeService.getGradesByCourse(req.params.id);
    res.status(200).json({ status: 'success', data: { grades } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_GET_COURSE_GRADES', message: (err as Error).message });
  }
}

export async function createGrade(req: AuthenticatedRequest, res: Response) {
  try {
    const grade = await GradeService.createGrade(req.params.enrollmentId, req.user!.id, req.body);
    res.status(201).json({ status: 'success', data: grade });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_GRADE', message: (err as Error).message });
  }
}

export async function updateGrade(req: AuthenticatedRequest, res: Response) {
  try {
    const grade = await GradeService.updateGrade(req.params.gradeId, req.user!.id, req.body);
    res.status(200).json({ status: 'success', data: grade });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 403;
    res.status(status).json({ status: 'failure', code: 'ERR_UPDATE_GRADE', message: (err as Error).message });
  }
}

export async function deleteGrade(req: AuthenticatedRequest, res: Response) {
  try {
    await GradeService.deleteGrade(req.params.gradeId, req.user!.id);
    res.status(200).json({ status: 'success', message: 'Note supprimée.' });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 403;
    res.status(status).json({ status: 'failure', code: 'ERR_DELETE_GRADE', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// ABSENCES
// ═══════════════════════════════════════════════

export async function recordAbsences(req: AuthenticatedRequest, res: Response) {
  try {
    const { absences, sessionDate } = req.body;
    const result = await AbsenceService.recordAbsences(
      req.params.scheduleId,
      req.user!.id,
      new Date(sessionDate),
      absences
    );
    res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_RECORD_ABSENCES', message: (err as Error).message });
  }
}

export async function getAbsencesByStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const absences = await AbsenceService.getAbsencesByStudent(req.params.studentId, req.query as Record<string, string>);
    res.status(200).json({ status: 'success', data: { absences } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_GET_ABSENCES', message: (err as Error).message });
  }
}

export async function justifyAbsence(req: AuthenticatedRequest, res: Response) {
  try {
    const { justification } = req.body;
    if (!justification) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Le champ "justification" est obligatoire.' });
      return;
    }
    const absence = await AbsenceService.justifyAbsence(req.params.absenceId, justification);
    res.status(200).json({ status: 'success', data: absence });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_JUSTIFY_ABSENCE', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// DEADLINES
// ═══════════════════════════════════════════════

export async function getDeadlinesForStudent(req: AuthenticatedRequest, res: Response) {
  try {
    // L'étudiant consulte ses propres deadlines
    const studentId = req.user!.role === 'student' ? req.user!.id : req.params.studentId;
    const deadlines = await DeadlineService.getDeadlinesForStudent(studentId);
    res.status(200).json({ status: 'success', data: { deadlines } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_GET_DEADLINES', message: (err as Error).message });
  }
}

export async function getDeadlinesByCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await DeadlineService.getDeadlinesByCourse(req.params.courseId, req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_GET_COURSE_DEADLINES', message: (err as Error).message });
  }
}

export async function createDeadline(req: AuthenticatedRequest, res: Response) {
  try {
    const deadline = await DeadlineService.createDeadline(
      req.params.courseId,
      req.user!.id,
      { ...req.body, dueAt: new Date(req.body.dueAt) }
    );
    res.status(201).json({ status: 'success', data: deadline });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_DEADLINE', message: (err as Error).message });
  }
}

export async function updateDeadline(req: AuthenticatedRequest, res: Response) {
  try {
    const data = { ...req.body };
    if (data.dueAt) data.dueAt = new Date(data.dueAt);
    const deadline = await DeadlineService.updateDeadline(req.params.deadlineId, data);
    res.status(200).json({ status: 'success', data: deadline });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_UPDATE_DEADLINE', message: (err as Error).message });
  }
}

export async function deleteDeadline(req: AuthenticatedRequest, res: Response) {
  try {
    await DeadlineService.deleteDeadline(req.params.deadlineId);
    res.status(200).json({ status: 'success', message: 'Deadline supprimée.' });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_DELETE_DEADLINE', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// RESSOURCES PÉDAGOGIQUES
// ═══════════════════════════════════════════════

export async function getResourcesByCourse(req: AuthenticatedRequest, res: Response) {
  try {
    const showHidden = ['instructor', 'admin', 'direction'].includes(req.user!.role);
    const resources = await ResourceService.getResourcesByCourse(req.params.courseId, showHidden);
    res.status(200).json({ status: 'success', data: { resources } });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_GET_RESOURCES', message: (err as Error).message });
  }
}

export async function uploadResource(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ status: 'failure', code: 'ERR_NO_FILE', message: 'Aucun fichier reçu.' });
      return;
    }
    const { title } = req.body;
    if (!title) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Le champ "title" est obligatoire.' });
      return;
    }
    const resource = await ResourceService.createFileResource(
      req.params.courseId,
      req.user!.id,
      req.file,
      title
    );
    res.status(201).json({ status: 'success', data: resource });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_UPLOAD_RESOURCE', message: (err as Error).message });
  }
}

export async function addLinkResource(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, url } = req.body;
    if (!title || !url) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Les champs "title" et "url" sont obligatoires.' });
      return;
    }
    const resource = await ResourceService.createLinkResource(req.params.courseId, req.user!.id, title, url);
    res.status(201).json({ status: 'success', data: resource });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_ADD_LINK', message: (err as Error).message });
  }
}

export async function toggleResourceVisibility(req: AuthenticatedRequest, res: Response) {
  try {
    const resource = await ResourceService.toggleResourceVisibility(req.params.resourceId);
    res.status(200).json({ status: 'success', data: resource });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_TOGGLE_RESOURCE', message: (err as Error).message });
  }
}

export async function deleteResource(req: AuthenticatedRequest, res: Response) {
  try {
    await ResourceService.deleteResource(req.params.resourceId);
    res.status(200).json({ status: 'success', message: 'Ressource supprimée.' });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_DELETE_RESOURCE', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// INSCRIPTIONS & HISTORIQUE ACADÉMIQUE
// ═══════════════════════════════════════════════

export async function getEnrollmentsByStudent(req: AuthenticatedRequest, res: Response) {
  try {
    const studentId = req.user!.role === 'student' ? req.user!.id : req.params.studentId;
    const result = await EnrollmentService.getEnrollmentsByStudent(studentId, req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_GET_ENROLLMENTS', message: (err as Error).message });
  }
}

export async function createEnrollment(req: AuthenticatedRequest, res: Response) {
  try {
    const enrollment = await EnrollmentService.createEnrollment(req.body);
    res.status(201).json({ status: 'success', data: enrollment });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_ENROLLMENT', message: (err as Error).message });
  }
}

export async function updateEnrollmentStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, finalGrade } = req.body;
    const enrollment = await EnrollmentService.updateEnrollmentStatus(req.params.enrollmentId, status, finalGrade);
    res.status(200).json({ status: 'success', data: enrollment });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_UPDATE_ENROLLMENT', message: (err as Error).message });
  }
}

export async function getAcademicRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const studentId = req.user!.role === 'student' ? req.user!.id : req.params.studentId;
    const records = await EnrollmentService.getAcademicRecordsByStudent(studentId);
    res.status(200).json({ status: 'success', data: { records } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_GET_RECORDS', message: (err as Error).message });
  }
}

export async function createAcademicRecord(req: AuthenticatedRequest, res: Response) {
  try {
    const record = await EnrollmentService.createAcademicRecord(req.body);
    res.status(201).json({ status: 'success', data: record });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_RECORD', message: (err as Error).message });
  }
}
