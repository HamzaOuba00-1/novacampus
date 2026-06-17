/**
 * middlewares/validation.middleware.ts
 * ---------------------------------------------------------------
 * Validation des données entrantes pour le service paiements.
 * ---------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';

interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number';
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

      if (rule.type === 'number' && isNaN(Number(value)))
        errors.push(`"${field}" doit être un nombre.`);
      if (rule.min !== undefined && Number(value) < rule.min)
        errors.push(`"${field}" doit être ≥ ${rule.min}.`);
      if (rule.max !== undefined && Number(value) > rule.max)
        errors.push(`"${field}" doit être ≤ ${rule.max}.`);
      if (rule.minLength && String(value).length < rule.minLength)
        errors.push(`"${field}" doit contenir au moins ${rule.minLength} caractères.`);
      if (rule.enum && !rule.enum.includes(String(value)))
        errors.push(`"${field}" doit être parmi : ${rule.enum.join(', ')}.`);
      if (rule.pattern && !rule.pattern.test(String(value)))
        errors.push(`"${field}" a un format invalide.`);
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
// Validateurs par endpoint
// ---------------------------------------------------------------

export const validateCreateInvoice = validate({
  studentId: { required: true, type: 'string' },
  programId: { required: true, type: 'string' },
  campusId: { required: true, type: 'string' },
  academicYear: { required: true, type: 'number', min: 2000, max: 2100 },
  semester: { required: true, type: 'number', min: 1, max: 2 },
  amount: { required: true, type: 'number', min: 0.01 },
  invoiceDate: { required: true, type: 'string' },
  dueDate: { required: true, type: 'string' },
});

export const validateRecordPayment = validate({
  paymentMethod: { required: true, enum: ['transfer', 'card', 'check', 'cash', 'other'] },
  paidAt: { type: 'string' },
  reference: { type: 'string' },
});

export const validateCreateReminder = validate({
  channel: { required: true, enum: ['email', 'sms', 'letter'] },
});

export const validateBatchReminders = validate({
  channel: { required: true, enum: ['email', 'sms', 'letter'] },
  trigger: { required: true, enum: ['manual', 'ai_agent', 'scheduled'] },
});
