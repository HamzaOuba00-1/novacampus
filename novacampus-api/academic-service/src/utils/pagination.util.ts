/**
 * utils/pagination.util.ts
 * ---------------------------------------------------------------
 * Fonctions utilitaires pour la pagination des listes.
 *
 * Centraliser ici garantit un comportement cohérent sur tous
 * les endpoints qui retournent des collections.
 * ---------------------------------------------------------------
 */

import { PaginationMeta } from '../types';

/**
 * Calcule l'offset SQL à partir du numéro de page et de la limite.
 *
 * @param page  - Numéro de page (1-indexé)
 * @param limit - Nombre d'éléments par page
 * @returns L'offset à passer à Sequelize
 */
export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Construit les métadonnées de pagination à inclure dans la réponse.
 *
 * @param total - Nombre total d'éléments dans la collection
 * @param page  - Numéro de page courante
 * @param limit - Taille de la page
 * @returns Objet PaginationMeta prêt à être sérialisé
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Normalise et sécurise les paramètres de pagination issus de req.query.
 * Applique des valeurs par défaut et plafonne la limite à 100.
 *
 * @param rawPage  - Valeur brute de la query ?page
 * @param rawLimit - Valeur brute de la query ?limit
 * @returns Page et limite validées
 */
export function parsePagination(
  rawPage?: string,
  rawLimit?: string
): { page: number; limit: number } {
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? '20', 10) || 20));
  return { page, limit };
}
