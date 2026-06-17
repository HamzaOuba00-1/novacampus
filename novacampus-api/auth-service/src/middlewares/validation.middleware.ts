/**
 * middlewares/validation.middleware.ts
 * ---------------------------------------------------------------
 * Middleware de validation des données entrantes (req.body).
 *
 * Principe : valider en entrée de route, avant d'atteindre le controller.
 * Cela permet de :
 *   – Retourner des erreurs explicites à l'utilisateur
 *   – Protéger les couches service et base de données de données malformées
 *   – Centraliser les règles de validation dans un seul endroit
 *
 * Chaque validateur retourne un middleware Express standard.
 * ---------------------------------------------------------------
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Type utilitaire : règle de validation pour un champ du body
 */
interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'email';
  minLength?: number;
}

/**
 * Fabrique de middleware de validation générique.
 * Vérifie la présence et le type des champs selon les règles fournies.
 *
 * @param rules - Dictionnaire champ → règles de validation
 * @returns Middleware Express
 */
function validate(rules: Record<string, ValidationRule>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];

      // Vérification de la présence pour les champs obligatoires
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Le champ "${field}" est obligatoire.`);
        continue;
      }

      // Vérification du type chaîne de caractères
      if (value !== undefined && rule.type === 'string' && typeof value !== 'string') {
        errors.push(`Le champ "${field}" doit être une chaîne de caractères.`);
        continue;
      }

      // Vérification du format email avec une regex basique
      if (value !== undefined && rule.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`Le champ "${field}" doit être une adresse email valide.`);
          continue;
        }
      }

      // Vérification de la longueur minimale
      if (value !== undefined && rule.minLength && value.length < rule.minLength) {
        errors.push(
          `Le champ "${field}" doit contenir au moins ${rule.minLength} caractères.`
        );
      }
    }

    // Si des erreurs ont été détectées, on rejette la requête avec un 400
    if (errors.length > 0) {
      res.status(400).json({
        status: 'failure',
        code: 'ERR_VALIDATION',
        message: 'Données de la requête invalides.',
        data: { errors },
      });
      return;
    }

    next();
  };
}

// ---------------------------------------------------------------
// Validateurs spécifiques aux routes auth
// ---------------------------------------------------------------

/** Valide le body de la route POST /auth/register */
export const validateRegister = validate({
  email: { required: true, type: 'email' },
  password: { required: true, type: 'string', minLength: 8 },
});

/** Valide le body de la route POST /auth/login */
export const validateLogin = validate({
  email: { required: true, type: 'email' },
  password: { required: true, type: 'string', minLength: 1 },
});

/** Valide le body de la route POST /auth/refresh */
export const validateRefresh = validate({
  refreshToken: { required: true, type: 'string' },
});

/** Valide le body de la route POST /auth/logout */
export const validateLogout = validate({
  refreshToken: { required: true, type: 'string' },
});

/** Valide le body de la route PATCH /auth/me/password */
export const validateChangePassword = validate({
  currentPassword: { required: true, type: 'string', minLength: 1 },
  newPassword: { required: true, type: 'string', minLength: 8 },
});
