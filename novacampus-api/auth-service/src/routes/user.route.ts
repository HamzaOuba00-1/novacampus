/**
 * routes/user.route.ts
 * ---------------------------------------------------------------
 * Routes de gestion administrative des comptes utilisateurs.
 *
 * Toutes ces routes nécessitent :
 *   1. Un access token valide (middleware authenticate)
 *   2. Un rôle admin ou direction (middleware requireRole)
 *
 * Préfixe dans index.ts : /api/users
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as UserController from '../controllers/user.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Toutes les routes de ce fichier nécessitent une authentification
router.use(authenticate);

/**
 * GET /api/users
 * Lister les utilisateurs avec filtres optionnels
 * Accès : admin, direction
 * Query : ?role=student&campusId=xxx&isActive=true&page=1&limit=20
 */
router.get('/', requireRole('admin', 'direction'), UserController.listUsers);

/**
 * GET /api/users/:id
 * Récupérer le profil d'un utilisateur spécifique
 * Accès : admin, direction
 */
router.get('/:id', requireRole('admin', 'direction'), UserController.getUserById);

/**
 * PATCH /api/users/:id
 * Modifier le rôle ou le campus d'un utilisateur
 * Accès : admin uniquement
 * Body : { role?, campusId? }
 */
router.patch('/:id', requireRole('admin'), UserController.updateUser);

/**
 * PATCH /api/users/:id/activate
 * Activer ou désactiver un compte utilisateur
 * Accès : admin uniquement
 * Body : { isActive: boolean }
 */
router.patch('/:id/activate', requireRole('admin'), UserController.setActiveStatus);

export default router;
