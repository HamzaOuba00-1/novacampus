/**
 * services/user.service.ts
 * ---------------------------------------------------------------
 * Couche service pour la gestion administrative des utilisateurs.
 *
 * Distinct du auth.service qui gère uniquement l'authentification,
 * ce service couvre les opérations CRUD réservées aux administrateurs :
 *   – Lister les utilisateurs d'un campus avec filtres
 *   – Modifier le rôle, le campus ou le statut d'un compte
 *   – Activer / désactiver un compte sans le supprimer
 *
 * Tous ces endpoints nécessitent le rôle `admin` ou `direction`.
 * ---------------------------------------------------------------
 */
import { Op, WhereOptions } from 'sequelize';
import User, { UserAttributes } from '../models/user.model';
import { UserRole } from '../types';

// ---------------------------------------------------------------
// Options de filtrage pour la liste des utilisateurs
// ---------------------------------------------------------------
interface ListUsersOptions {
  role?: UserRole;
  campusId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Retourne la liste paginée des utilisateurs avec filtres optionnels.
 *
 * @param options - Filtres et paramètres de pagination
 * @returns Les utilisateurs correspondants et le total
 */
export async function listUsers(options: ListUsersOptions): Promise<{
  users: object[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { role, campusId, isActive, page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Construction dynamique des conditions WHERE
  const where: WhereOptions<UserAttributes> = {};
  if (role) where['role'] = role;
  if (campusId) where['campusId'] = campusId;
  if (isActive !== undefined) where['isActive'] = isActive;

  const { count, rows } = await User.findAndCountAll({
    where,
    // Exclusion du hash de mot de passe de toutes les réponses
    attributes: { exclude: ['passwordHash'] },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return {
    users: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  };
}

/**
 * Retourne le profil public d'un utilisateur par son identifiant.
 *
 * @param userId - L'UUID de l'utilisateur à récupérer
 * @returns Les données publiques du compte (sans le hash)
 * @throws Error si l'utilisateur est introuvable
 */
export async function getUserById(userId: string): Promise<object> {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['passwordHash'] },
  });

  if (!user) {
    throw new Error('Utilisateur introuvable.');
  }

  return user;
}

/**
 * Met à jour les métadonnées d'un compte utilisateur.
 * Seuls les champs autorisés peuvent être modifiés par cette route.
 * Le mot de passe est géré séparément via changePassword.
 *
 * @param userId - L'UUID de l'utilisateur à modifier
 * @param updates - Les champs à mettre à jour
 * @returns Les données mises à jour (sans le hash)
 * @throws Error si l'utilisateur est introuvable
 */
export async function updateUser(
  userId: string,
  updates: Partial<{
    role: UserRole;
    campusId: string | null;
  }>
): Promise<object> {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error('Utilisateur introuvable.');
  }

  await user.update(updates);

  // Retourner les données sans le hash pour ne pas l'exposer
  const { passwordHash: _omit, ...publicData } = user.toJSON() as unknown as Record<string, unknown>;
  return publicData;
}

/**
 * Active ou désactive un compte utilisateur.
 * La désactivation empêche la connexion sans supprimer les données.
 *
 * @param userId - L'UUID du compte à modifier
 * @param isActive - true pour activer, false pour désactiver
 * @throws Error si l'utilisateur est introuvable
 */
export async function setUserActiveStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error('Utilisateur introuvable.');
  }

  await user.update({ isActive });
}