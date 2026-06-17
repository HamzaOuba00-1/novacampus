/**
 * middlewares/auth.middleware.ts
 * ---------------------------------------------------------------
 * Middleware d'authentification par JWT pour le service académique.
 *
 * Identique dans sa logique au middleware de l'auth-service.
 * Chaque microservice vérifie lui-même les tokens pour ne pas
 * créer de dépendance réseau synchrone vers l'auth-service
 * sur chaque requête.
 *
 * Seul le JWT_SECRET doit être partagé entre les services.
 * ---------------------------------------------------------------
 */

import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware principal d'authentification.
 * Extrait le token Bearer, le vérifie et peuple req.user.
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    res.status(401).json({
      status: 'failure',
      code: 'ERR_NO_TOKEN',
      message: 'Token d\'authentification manquant.',
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      status: 'failure',
      code: 'ERR_BAD_TOKEN_FORMAT',
      message: 'Format du token invalide. Attendu : Bearer <token>',
    });
    return;
  }

  const decoded = verifyAccessToken(parts[1]);
  if (!decoded) {
    res.status(401).json({
      status: 'failure',
      code: 'ERR_TOKEN_INVALID',
      message: 'Token invalide ou expiré.',
    });
    return;
  }

  req.user = decoded;
  next();
}

/**
 * Middleware de restriction par rôle.
 * À placer après authenticate sur les routes sensibles.
 *
 * @param roles - Rôles autorisés à accéder à la route
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'failure',
        code: 'ERR_UNAUTHENTICATED',
        message: 'Authentification requise.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        status: 'failure',
        code: 'ERR_FORBIDDEN',
        message: `Accès refusé. Rôles autorisés : ${roles.join(', ')}.`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware de vérification de propriété.
 * Vérifie qu'un étudiant ne peut accéder qu'à ses propres données,
 * sauf si l'utilisateur est admin, direction ou instructor.
 *
 * @param getResourceOwnerId - Fonction qui extrait l'id propriétaire de la requête
 */
export function requireOwnerOrStaff(
  getResourceOwnerId: (req: AuthenticatedRequest) => string
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'failure',
        code: 'ERR_UNAUTHENTICATED',
        message: 'Authentification requise.',
      });
      return;
    }

    const staffRoles = ['admin', 'direction', 'instructor'];
    if (staffRoles.includes(req.user.role)) {
      next();
      return;
    }

    // Pour un étudiant : vérifier qu'il accède à ses propres données
    const ownerId = getResourceOwnerId(req);
    if (req.user.id !== ownerId) {
      res.status(403).json({
        status: 'failure',
        code: 'ERR_FORBIDDEN',
        message: 'Vous ne pouvez accéder qu\'à vos propres données.',
      });
      return;
    }

    next();
  };
}
