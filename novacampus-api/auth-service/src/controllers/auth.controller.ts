/**
 * controllers/auth.controller.ts
 * ---------------------------------------------------------------
 * Contrôleur du module d'authentification.
 *
 * Rôle du contrôleur :
 *   – Lire les données de la requête HTTP (req.body, req.headers, req.user)
 *   – Appeler le service métier approprié
 *   – Formater la réponse HTTP (status code, corps JSON normalisé)
 *   – Gérer les erreurs et les traduire en codes HTTP appropriés
 *
 * Le contrôleur ne contient JAMAIS de logique métier.
 * Il ne connaît pas Sequelize, bcrypt ou JWT directement.
 *
 * Format de réponse normalisé (conforme à l'architecture définie) :
 *   – Succès  : { status: 'success', data: { ... } }
 *   – Échec   : { status: 'failure', code: 'ERR_xxx', message: '...' }
 * ---------------------------------------------------------------
 */

import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';
import { AuthenticatedRequest } from '../types';

/**
 * POST /api/auth/register
 * Inscription d'un nouvel utilisateur.
 * Statut 201 Created en cas de succès (nouvelle ressource créée).
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const result = await AuthService.register(req.body);
    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de l\'inscription.';
    res.status(400).json({
      status: 'failure',
      code: 'ERR_REGISTER',
      message,
    });
  }
}

/**
 * POST /api/auth/login
 * Connexion d'un utilisateur existant.
 * Retourne un access token (15 min) et un refresh token (7 jours).
 * Statut 401 si les identifiants sont incorrects ou le compte inactif.
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Collecte des informations d'appareil pour le suivi des sessions
    const deviceInfo = {
      userAgent: req.headers['user-agent'] ?? 'unknown',
      ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
    };

    const result = await AuthService.login(email, password, deviceInfo);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la connexion.';
    res.status(401).json({
      status: 'failure',
      code: 'ERR_LOGIN',
      message,
    });
  }
}

/**
 * POST /api/auth/refresh
 * Renouvelle l'access token à partir du refresh token.
 * Applique la rotation : l'ancien refresh token est révoqué et un nouveau est émis.
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshTokens(refreshToken);

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors du renouvellement.';
    res.status(401).json({
      status: 'failure',
      code: 'ERR_REFRESH',
      message,
    });
  }
}

/**
 * POST /api/auth/logout
 * Révoque le refresh token fourni (déconnexion de la session courante).
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    await AuthService.logout(refreshToken);

    res.status(200).json({
      status: 'success',
      message: 'Déconnexion réussie.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la déconnexion.';
    res.status(400).json({
      status: 'failure',
      code: 'ERR_LOGOUT',
      message,
    });
  }
}

/**
 * POST /api/auth/logout-all
 * Révoque toutes les sessions actives de l'utilisateur connecté.
 * Nécessite un access token valide (middleware authenticate).
 */
export async function logoutAll(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    await AuthService.logoutAll(req.user!.id);

    res.status(200).json({
      status: 'success',
      message: 'Toutes les sessions ont été révoquées.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la déconnexion globale.';
    res.status(500).json({
      status: 'failure',
      code: 'ERR_LOGOUT_ALL',
      message,
    });
  }
}

/**
 * GET /api/auth/me
 * Retourne le profil de l'utilisateur connecté à partir du JWT décodé.
 * Aucune requête supplémentaire en base – les données viennent du token.
 */
export function getMe(req: AuthenticatedRequest, res: Response): void {
  // req.user est garanti par le middleware authenticate
  res.status(200).json({
    status: 'success',
    data: req.user,
  });
}

/**
 * GET /api/auth/sessions
 * Liste les sessions actives de l'utilisateur connecté.
 */
export async function getSessions(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const sessions = await AuthService.getActiveSessions(req.user!.id);

    res.status(200).json({
      status: 'success',
      data: { sessions },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la récupération des sessions.';
    res.status(500).json({
      status: 'failure',
      code: 'ERR_SESSIONS',
      message,
    });
  }
}

/**
 * PATCH /api/auth/me/password
 * Modifie le mot de passe de l'utilisateur connecté.
 * Révoque toutes les sessions existantes après succès.
 */
export async function changePassword(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    await AuthService.changePassword(req.user!.id, currentPassword, newPassword);

    res.status(200).json({
      status: 'success',
      message: 'Mot de passe modifié. Veuillez vous reconnecter.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors du changement de mot de passe.';
    res.status(400).json({
      status: 'failure',
      code: 'ERR_CHANGE_PASSWORD',
      message,
    });
  }
}

/**
 * GET /api/auth/validate
 * Route interne utilisée par la gateway NGINX pour vérifier la validité d'un token.
 * Retourne 200 si le token est valide, 401 sinon (géré par le middleware authenticate).
 */
export function validate(req: AuthenticatedRequest, res: Response): void {
  // Si on arrive ici, authenticate a déjà validé le token et peuplé req.user
  res.status(200).json({
    status: 'success',
    message: 'Token valide.',
    data: req.user,
  });
}
