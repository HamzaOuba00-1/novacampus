/**
 * controllers/user.controller.ts
 * ---------------------------------------------------------------
 * Contrôleur pour la gestion administrative des utilisateurs.
 *
 * Routes couvertes :
 *   – GET  /api/users            → lister les utilisateurs (admin/direction)
 *   – GET  /api/users/:id        → détail d'un compte (admin/direction)
 *   – PATCH /api/users/:id       → modifier rôle/campus (admin)
 *   – PATCH /api/users/:id/activate → activer ou désactiver (admin)
 *
 * Toutes ces routes nécessitent le rôle `admin` ou `direction`.
 * La vérification de rôle est effectuée par le middleware requireRole
 * dans les routes, pas ici.
 * ---------------------------------------------------------------
 */
import { Response } from 'express';
import * as UserService from '../services/user.service';
import { AuthenticatedRequest, UserRole } from '../types';

/**
 * GET /api/users
 * Liste paginée des utilisateurs avec filtres optionnels.
 * Query params : role, campusId, isActive, page, limit
 */
export async function listUsers(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const {
      role,
      campusId,
      isActive,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const result = await UserService.listUsers({
      role: role as UserRole | undefined,
      campusId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // Limite maximale de 100 par page
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la récupération des utilisateurs.';
    res.status(500).json({
      status: 'failure',
      code: 'ERR_LIST_USERS',
      message,
    });
  }
}

/**
 * GET /api/users/:id
 * Retourne le profil complet d'un utilisateur (sans le hash de mot de passe).
 */
export async function getUserById(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const user = await UserService.getUserById(req.params.id as string);
    res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Utilisateur introuvable.';
    res.status(404).json({
      status: 'failure',
      code: 'ERR_USER_NOT_FOUND',
      message,
    });
  }
}

/**
 * PATCH /api/users/:id
 * Modifie le rôle ou le campus rattaché d'un utilisateur.
 * Le mot de passe ne peut pas être modifié par cette route.
 */
export async function updateUser(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { role, campusId } = req.body;
    const updated = await UserService.updateUser(req.params.id as string, { role, campusId });
    res.status(200).json({
      status: 'success',
      data: updated,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour.';
    const status = message.includes('introuvable') ? 404 : 400;
    res.status(status).json({
      status: 'failure',
      code: 'ERR_UPDATE_USER',
      message,
    });
  }
}

/**
 * PATCH /api/users/:id/activate
 * Active ou désactive un compte utilisateur.
 * Body : { isActive: boolean }
 */
export async function setActiveStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        status: 'failure',
        code: 'ERR_VALIDATION',
        message: 'Le champ "isActive" doit être un booléen.',
      });
      return;
    }

    await UserService.setUserActiveStatus(req.params.id as string, isActive);
    res.status(200).json({
      status: 'success',
      message: `Compte ${isActive ? 'activé' : 'désactivé'} avec succès.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors du changement de statut.';
    const status = message.includes('introuvable') ? 404 : 500;
    res.status(status).json({
      status: 'failure',
      code: 'ERR_SET_ACTIVE',
      message,
    });
  }
}