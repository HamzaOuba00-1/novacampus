/**
 * middlewares/validation.middleware.ts
 * ---------------------------------------------------------------
 * Validation des données entrantes pour le service inscriptions.
 * ---------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';

interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number';
  minLength?: number;
  min?: number;
  max?: number;
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

      if (rule.type === 'number' && isNaN(Number(value)))
        errors.push(`"${field}" doit être un nombre.`);
      if (rule.minLength && String(value).length < rule.minLength)
        errors.push(`"${field}" doit contenir au moins ${rule.minLength} caractères.`);
      if (rule.min !== undefined && Number(value) < rule.min)
        errors.push(`"${field}" doit être ≥ ${rule.min}.`);
      if (rule.max !== undefined && Number(value) > rule.max)
        errors.push(`"${field}" doit être ≤ ${rule.max}.`);
      if (rule.enum && !rule.enum.includes(String(value)))
        errors.push(`"${field}" doit être parmi : ${rule.enum.join(', ')}.`);
      if (rule.pattern && !rule.pattern.test(String(value)))
        errors.push(`"${field}" a un format invalide.`);
    }

    if (errors.length > 0) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Données invalides.', data: { errors } });
      return;
    }
    next();
  };
}

// ---------------------------------------------------------------
// Validateurs spécifiques
// ---------------------------------------------------------------

export const validateCreateStudent = validate({
  userId: { required: true, type: 'string' },
  programId: { required: true, type: 'string' },
  campusId: { required: true, type: 'string' },
  firstName: { required: true, type: 'string', minLength: 2 },
  lastName: { required: true, type: 'string', minLength: 2 },
  enrollmentYear: { required: true, type: 'number', min: 2000, max: 2100 },
});

export const validateUpdateStudent = validate({
  firstName: { type: 'string', minLength: 2 },
  lastName: { type: 'string', minLength: 2 },
  phone: { type: 'string', pattern: /^\+?[\d\s\-().]{7,20}$/ },
  postalCode: { type: 'string', pattern: /^\d{5}$/ },
});

export const validateCreateInstructor = validate({
  userId: { required: true, type: 'string' },
  campusId: { required: true, type: 'string' },
  contractType: { required: true, enum: ['permanent', 'visiting', 'freelance'] },
});

export const validateUpdateStatus = validate({
  status: { required: true, enum: ['active', 'suspended', 'graduated', 'withdrawn'] },
});

export const validateVerifyDocument = validate({
  verificationStatus: { required: true, enum: ['verified', 'rejected'] },
});
