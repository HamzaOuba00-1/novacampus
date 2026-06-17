/**
 * middlewares/validation.middleware.ts
 * ---------------------------------------------------------------
 * Validation des données entrantes pour le service académique.
 * Vérifie la présence et le type des champs obligatoires
 * avant d'atteindre les controllers et services.
 * ---------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';

interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  min?: number;
  max?: number;
  minLength?: number;
  enum?: string[];
}

/**
 * Fabrique générique de middleware de validation.
 */
function validate(rules: Record<string, FieldRule>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      const missing = value === undefined || value === null || value === '';

      if (rule.required && missing) {
        errors.push(`Le champ "${field}" est obligatoire.`);
        continue;
      }
      if (missing) continue;

      if (rule.type === 'number' && isNaN(Number(value))) {
        errors.push(`Le champ "${field}" doit être un nombre.`);
        continue;
      }
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`Le champ "${field}" doit être une chaîne.`);
        continue;
      }
      if (rule.min !== undefined && Number(value) < rule.min) {
        errors.push(`Le champ "${field}" doit être ≥ ${rule.min}.`);
      }
      if (rule.max !== undefined && Number(value) > rule.max) {
        errors.push(`Le champ "${field}" doit être ≤ ${rule.max}.`);
      }
      if (rule.minLength !== undefined && String(value).length < rule.minLength) {
        errors.push(`Le champ "${field}" doit contenir au moins ${rule.minLength} caractères.`);
      }
      if (rule.enum && !rule.enum.includes(String(value))) {
        errors.push(`Le champ "${field}" doit être l'une des valeurs : ${rule.enum.join(', ')}.`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        status: 'failure',
        code: 'ERR_VALIDATION',
        message: 'Données invalides.',
        data: { errors },
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------
// Validateurs par ressource
// ---------------------------------------------------------------

export const validateCreateProgram = validate({
  campusId: { required: true, type: 'string' },
  name: { required: true, type: 'string', minLength: 2 },
  type: { required: true, enum: ['bachelor', 'master', 'other'] },
  durationYears: { required: true, type: 'number', min: 1, max: 10 },
  annualTuition: { required: true, type: 'number', min: 0 },
  maxStudents: { required: true, type: 'number', min: 1 },
});

export const validateCreateCourse = validate({
  programId: { required: true, type: 'string' },
  code: { required: true, type: 'string', minLength: 3 },
  name: { required: true, type: 'string', minLength: 2 },
  semester: { required: true, type: 'number', min: 1, max: 6 },
  credits: { required: true, type: 'number', min: 1 },
  hoursTotal: { required: true, type: 'number', min: 1 },
});

export const validateCreateGrade = validate({
  label: { required: true, type: 'string', minLength: 1 },
  value: { required: true, type: 'number', min: 0, max: 20 },
  weight: { type: 'number', min: 0.1 },
});

export const validateCreateAbsences = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { absences, sessionDate } = req.body;
  const errors: string[] = [];

  if (!sessionDate) errors.push('Le champ "sessionDate" est obligatoire.');
  if (!Array.isArray(absences) || absences.length === 0) {
    errors.push('Le champ "absences" doit être un tableau non vide.');
  } else {
    absences.forEach((a: Record<string, unknown>, i: number) => {
      if (!a.enrollmentId) errors.push(`absences[${i}].enrollmentId est obligatoire.`);
      if (!a.type || !['absent', 'late', 'justified'].includes(String(a.type))) {
        errors.push(`absences[${i}].type doit être absent | late | justified.`);
      }
    });
  }

  if (errors.length > 0) {
    res.status(400).json({
      status: 'failure',
      code: 'ERR_VALIDATION',
      message: 'Données invalides.',
      data: { errors },
    });
    return;
  }
  next();
};

export const validateCreateDeadline = validate({
  title: { required: true, type: 'string', minLength: 2 },
  dueAt: { required: true, type: 'string' },
  type: { required: true, enum: ['homework', 'project', 'exam', 'other'] },
});

export const validateCreateEnrollment = validate({
  studentId: { required: true, type: 'string' },
  courseId: { required: true, type: 'string' },
  academicYear: { required: true, type: 'number', min: 2000, max: 2100 },
  semester: { required: true, type: 'number', min: 1, max: 2 },
});

export const validateCreateAcademicRecord = validate({
  studentId: { required: true, type: 'string' },
  programId: { required: true, type: 'string' },
  academicYear: { required: true, type: 'number', min: 2000, max: 2100 },
  yearInProgram: { required: true, type: 'number', min: 1, max: 10 },
  result: { required: true, enum: ['validated', 'failed', 'deferred'] },
});
