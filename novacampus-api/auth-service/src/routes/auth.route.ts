/**
 * routes/auth.route.ts
 * ---------------------------------------------------------------
 * Définition des routes du module d'authentification.
 *
 * Chaque route est câblée avec :
 *   1. Les middlewares de validation (vérification du body en entrée)
 *   2. Les middlewares de protection (authenticate, requireRole)
 *   3. Le controller correspondant
 *
 * Toutes les routes sont préfixées avec /api/auth dans l'index.ts
 *
 * Routes publiques (sans JWT) :
 *   POST /register  – inscription
 *   POST /login     – connexion
 *   POST /refresh   – renouvellement de tokens
 *
 * Routes protégées (JWT requis) :
 *   POST   /logout      – déconnexion session courante
 *   POST   /logout-all  – déconnexion toutes sessions
 *   GET    /me          – profil utilisateur connecté
 *   GET    /sessions    – liste des sessions actives
 *   PATCH  /me/password – changement de mot de passe
 *   GET    /validate    – validation interne pour la gateway NGINX
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as AuthController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import {
  validateRegister,
  validateLogin,
  validateRefresh,
  validateLogout,
  validateChangePassword,
} from '../middlewares/validation.middleware';

const router = Router();

// ---------------------------------------------------------------
// Routes publiques – accessibles sans authentification
// ---------------------------------------------------------------

/**
 * Inscription d'un nouvel utilisateur
 * Body : { email, password, role?, campusId? }
 */
router.post('/register', validateRegister, AuthController.register);

/**
 * Connexion et obtention des tokens
 * Body : { email, password }
 * Réponse : { accessToken, refreshToken, user }
 */
router.post('/login', validateLogin, AuthController.login);

/**
 * Renouvellement de l'access token
 * Body : { refreshToken }
 * Réponse : { accessToken, refreshToken }
 */
router.post('/refresh', validateRefresh, AuthController.refresh);

// ---------------------------------------------------------------
// Routes protégées – nécessitent un access token valide
// ---------------------------------------------------------------

/**
 * Déconnexion de la session courante (révocation du refresh token)
 * Header : Authorization: Bearer <accessToken>
 * Body   : { refreshToken }
 */
router.post('/logout', authenticate, validateLogout, AuthController.logout);

/**
 * Déconnexion de toutes les sessions actives
 * Header : Authorization: Bearer <accessToken>
 */
router.post('/logout-all', authenticate, AuthController.logoutAll);

/**
 * Profil de l'utilisateur connecté (données du JWT décodé)
 * Header : Authorization: Bearer <accessToken>
 */
router.get('/me', authenticate, AuthController.getMe);

/**
 * Liste des sessions actives de l'utilisateur connecté
 * Header : Authorization: Bearer <accessToken>
 */
router.get('/sessions', authenticate, AuthController.getSessions);

/**
 * Modification du mot de passe
 * Header : Authorization: Bearer <accessToken>
 * Body   : { currentPassword, newPassword }
 */
router.patch(
  '/me/password',
  authenticate,
  validateChangePassword,
  AuthController.changePassword
);

/**
 * Route de validation interne utilisée par la gateway NGINX
 * Appelée via `auth_request /authenticate;` dans nginx.conf
 * Retourne 200 si le token est valide, 401 sinon
 */
router.get('/validate', authenticate, AuthController.validate);

export default router;
