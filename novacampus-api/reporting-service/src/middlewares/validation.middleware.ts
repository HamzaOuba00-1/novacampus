/**
 * middlewares/validation.middleware.ts
 * ---------------------------------------------------------------
 * Validation des données entrantes pour le service reporting/IA.
 * ---------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';

interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number';
  min?: number;
  max?: number;
  enum?: string[];
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
      if (rule.enum && !rule.enum.includes(String(value))) errors.push(`"${field}" doit être parmi : ${rule.enum.join(', ')}.`);
    }
    if (errors.length > 0) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Données invalides.', data: { errors } });
      return;
    }
    next();
  };
}

export const validateExportRequest = validate({
  reportType: { required: true, enum: ['attendance', 'grades', 'revenue', 'ai_alerts', 'students', 'kpis'] },
  format: { enum: ['csv', 'json'] },
});

export const validateUpdateAlert = validate({
  status: { required: true, enum: ['actioned', 'dismissed'] },
});

export const validateAnalyzeRequest = validate({
  scope: { required: true, enum: ['student', 'campus', 'global'] },
});
