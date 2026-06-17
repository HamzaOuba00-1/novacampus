/**
 * middlewares/validation.middleware.ts
 * ---------------------------------------------------------------
 * Validation des données entrantes pour le service notifications.
 * ---------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';

interface FieldRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  minLength?: number;
  enum?: string[];
  isArray?: boolean;
}

function validate(rules: Record<string, FieldRule>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      const missing = value === undefined || value === null || value === '';

      if (rule.required && missing) { errors.push(`"${field}" est obligatoire.`); continue; }
      if (missing) continue;

      if (rule.isArray && !Array.isArray(value))
        errors.push(`"${field}" doit être un tableau.`);
      if (rule.isArray && Array.isArray(value) && value.length === 0)
        errors.push(`"${field}" ne peut pas être vide.`);
      if (rule.type === 'string' && typeof value !== 'string')
        errors.push(`"${field}" doit être une chaîne.`);
      if (rule.minLength && String(value).length < rule.minLength)
        errors.push(`"${field}" doit contenir au moins ${rule.minLength} caractères.`);
      if (rule.enum && !rule.enum.includes(String(value)))
        errors.push(`"${field}" doit être parmi : ${rule.enum.join(', ')}.`);
    }

    if (errors.length > 0) {
      res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Données invalides.', data: { errors } });
      return;
    }
    next();
  };
}

const NOTIF_TYPES = [
  'schedule_change', 'schedule_cancelled', 'grade_added', 'grade_updated',
  'absence_recorded', 'deadline_created', 'deadline_updated',
  'payment_reminder', 'payment_received', 'payment_overdue',
  'ai_alert', 'account_activated', 'document_verified', 'system',
];

export const validateCreateNotification = validate({
  userId: { required: true, type: 'string' },
  type: { required: true, enum: NOTIF_TYPES },
  title: { required: true, type: 'string', minLength: 1 },
  body: { required: true, type: 'string', minLength: 1 },
});

export const validateBroadcast = (req: Request, res: Response, next: NextFunction): void => {
  const { userIds, type, title, body } = req.body;
  const errors: string[] = [];

  if (!Array.isArray(userIds) || userIds.length === 0)
    errors.push('"userIds" doit être un tableau non vide.');
  if (!type || !NOTIF_TYPES.includes(type))
    errors.push(`"type" doit être parmi : ${NOTIF_TYPES.join(', ')}.`);
  if (!title || typeof title !== 'string')
    errors.push('"title" est obligatoire.');
  if (!body || typeof body !== 'string')
    errors.push('"body" est obligatoire.');

  if (errors.length > 0) {
    res.status(400).json({ status: 'failure', code: 'ERR_VALIDATION', message: 'Données invalides.', data: { errors } });
    return;
  }
  next();
};

export const validateUpdatePreferences = validate({
  notifType: { required: true, enum: NOTIF_TYPES },
});
