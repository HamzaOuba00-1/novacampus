/**
 * middlewares/validation.middleware.ts
 * ---------------------------------------------------------------
 * Validation des données entrantes pour le service campus/admin.
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
      if (rule.required && missing) { errors.push(`"${field}" est obligatoire.`); continue; }
      if (missing) continue;
      if (rule.type === 'number' && isNaN(Number(value))) errors.push(`"${field}" doit être un nombre.`);
      if (rule.min !== undefined && Number(value) < rule.min) errors.push(`"${field}" doit être ≥ ${rule.min}.`);
      if (rule.max !== undefined && Number(value) > rule.max) errors.push(`"${field}" doit être ≤ ${rule.max}.`);
      if (rule.minLength && String(value).length < rule.minLength) errors.push(`"${field}" doit contenir au moins ${rule.minLength} caractères.`);
      if (rule.enum && !rule.enum.includes(String(value))) errors.push(`"${field}" doit être parmi : ${rule.enum.join(', ')}.`);
      if (rule.pattern && !rule.pattern.test(String(value))) errors.push(`"${field}" a un format invalide.`);
    }
    if (errors.length > 0) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Données invalides.', data: { errors } });
      return;
    }
    next();
  };
}

export const validateCreateCampus = validate({
  code: { required: true, type: 'string', minLength: 3 },
  name: { required: true, type: 'string', minLength: 2 },
  city: { required: true, type: 'string', minLength: 2 },
  capacityStudents: { required: true, type: 'number', min: 1 },
});

export const validateUpdateCampus = validate({
  name: { type: 'string', minLength: 2 },
  city: { type: 'string', minLength: 2 },
  phone: { type: 'string', pattern: /^\+?[\d\s\-().]{7,20}$/ },
  postalCode: { type: 'string', pattern: /^\d{5}$/ },
  capacityStudents: { type: 'number', min: 1 },
  status: { enum: ['active', 'inactive', 'archived'] },
});

export const validateCreateAcademicYear = validate({
  year: { required: true, type: 'number', min: 2000, max: 2100 },
  s1Start: { required: true, type: 'string' },
  s1End: { required: true, type: 'string' },
  s2Start: { required: true, type: 'string' },
  s2End: { required: true, type: 'string' },
});

export const validateCreateAuditLog = validate({
  actorId: { required: true, type: 'string' },
  action: { required: true, type: 'string', minLength: 3 },
  entityType: { required: true, type: 'string', minLength: 1 },
});

export const validateUpsertConfig = validate({
  key: { required: true, type: 'string', minLength: 3 },
  value: { required: true, type: 'string' },
});
