/**
 * middlewares/validation.middleware.ts
 * ---------------------------------------------------------------
 * Validation des données entrantes pour le service planification.
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
  pattern?: RegExp;
}

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
      if (rule.min !== undefined && Number(value) < rule.min)
        errors.push(`Le champ "${field}" doit être ≥ ${rule.min}.`);
      if (rule.max !== undefined && Number(value) > rule.max)
        errors.push(`Le champ "${field}" doit être ≤ ${rule.max}.`);
      if (rule.minLength && String(value).length < rule.minLength)
        errors.push(`Le champ "${field}" doit contenir au moins ${rule.minLength} caractères.`);
      if (rule.enum && !rule.enum.includes(String(value)))
        errors.push(`Le champ "${field}" doit être parmi : ${rule.enum.join(', ')}.`);
      if (rule.pattern && !rule.pattern.test(String(value)))
        errors.push(`Le champ "${field}" a un format invalide.`);
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

export const validateCreateRoom = validate({
  campusId: { required: true, type: 'string' },
  code: { required: true, type: 'string', minLength: 2 },
  name: { required: true, type: 'string', minLength: 2 },
  building: { required: true, type: 'string', minLength: 1 },
  capacity: { required: true, type: 'number', min: 1 },
  type: { required: true, enum: ['amphitheater', 'td', 'lab', 'seminar'] },
});

export const validateCreateSchedule = validate({
  courseId: { required: true, type: 'string' },
  instructorId: { required: true, type: 'string' },
  roomId: { required: true, type: 'string' },
  academicYear: { required: true, type: 'number', min: 2000, max: 2100 },
  semester: { required: true, type: 'number', min: 1, max: 2 },
  dayOfWeek: { required: true, type: 'number', min: 0, max: 6 },
  startTime: { required: true, type: 'string', pattern: /^\d{2}:\d{2}$/ },
  endTime: { required: true, type: 'string', pattern: /^\d{2}:\d{2}$/ },
});

export const validateCreateException = validate({
  exceptionDate: { required: true, type: 'string' },
  type: { required: true, enum: ['room_change', 'time_change', 'cancelled'] },
});

export const validateResolveConflict = validate({
  status: { required: true, enum: ['resolved', 'ignored'] },
});
