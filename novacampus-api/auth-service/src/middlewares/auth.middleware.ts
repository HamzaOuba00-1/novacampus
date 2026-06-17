/**
 * middlewares/auth.middleware.ts
 * ---------------------------------------------------------------
 * Middleware Express d'authentification par JWT.
 *
 * Fonctionnement :
 *   1. Extrait le token du header Authorization (format : "Bearer <token>")
 *   2. Vérifie la signature et l'expiration via jwt.util
 *   3. Attache le payload décodé à req.user pour les controllers suivants
 *   4. Rejette avec 401 si absent, malformé ou expiré
 *
 * Ce middleware est placé avant les controllers sur toutes les routes
 * nécessitant une authentification. Il est également utilisé par la
 * gateway NGINX via la route interne /api/auth/validate.
 * ---------------------------------------------------------------
 */

import { Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware principal d'authentification.
 * Vérifie le token JWT dans le header Authorization et peuple req.user.
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Lecture du header Authorization
  const authHeader = req.headers['authorization'];

  // Rejet si le header est absent
  if (!authHeader) {
    res.status(401).json({
      status: 'failure',
      code: 'ERR_NO_TOKEN',
      message: 'Token d\'authentification manquant.',
    });
    return;
  }

  // Extraction du token – le format attendu est "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      status: 'failure',
      code: 'ERR_BAD_TOKEN_FORMAT',
      message: 'Format du token invalide. Attendu : Bearer <token>',
    });
    return;
  }

  const token = parts[1];

  // Vérification cryptographique du token (signature + expiration)
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    res.status(401).json({
      status: 'failure',
      code: 'ERR_TOKEN_INVALID',
      message: 'Token invalide ou expiré.',
    });
    return;
  }

  // Attachement du payload décodé à la requête pour les couches suivantes
  req.user = decoded;
  next();
}

/**
 * Middleware de restriction par rôle.
 * À utiliser après authenticate – vérifie que req.user possède l'un des rôles autorisés.
 *
 * Exemple d'utilisation :
 *   router.get('/admin', authenticate, requireRole('admin', 'direction'), controller)
 *
 * @param roles - Un ou plusieurs rôles autorisés à accéder à la route
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Ce middleware suppose que authenticate a déjà été appelé
    if (!req.user) {
      res.status(401).json({
        status: 'failure',
        code: 'ERR_UNAUTHENTICATED',
        message: 'Authentification requise.',
      });
      return;
    }

    // Vérification que le rôle de l'utilisateur figure parmi les rôles autorisés
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
