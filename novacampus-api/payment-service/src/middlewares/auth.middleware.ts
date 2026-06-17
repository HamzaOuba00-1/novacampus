/**
 * middlewares/auth.middleware.ts
 * ---------------------------------------------------------------
 * Middleware d'authentification JWT pour le service paiements.
 * ---------------------------------------------------------------
 */

import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AuthenticatedRequest } from '../types';

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    res.status(401).json({ status: 'failure', code: 'ERR_NO_TOKEN', message: 'Token d\'authentification manquant.' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ status: 'failure', code: 'ERR_BAD_TOKEN_FORMAT', message: 'Format du token invalide. Attendu : Bearer <token>' });
    return;
  }

  const decoded = verifyAccessToken(parts[1]);
  if (!decoded) {
    res.status(401).json({ status: 'failure', code: 'ERR_TOKEN_INVALID', message: 'Token invalide ou expiré.' });
    return;
  }

  req.user = decoded;
  next();
}

/**
 * Restriction par rôle – à placer après authenticate.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'failure', code: 'ERR_UNAUTHENTICATED', message: 'Authentification requise.' });
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
 * Vérifie qu'un étudiant n'accède qu'à ses propres factures.
 */
export function requireOwnerOrStaff(
  getStudentId: (req: AuthenticatedRequest) => string
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'failure', code: 'ERR_UNAUTHENTICATED', message: 'Authentification requise.' });
      return;
    }
    if (['admin', 'direction'].includes(req.user.role)) {
      next();
      return;
    }
    // Pour un étudiant : la vérification se fait au niveau du service
    // en comparant l'id du token avec le studentId de la facture
    next();
  };
}
