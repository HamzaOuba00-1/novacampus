/**
 * utils/pagination.util.ts
 * ---------------------------------------------------------------
 * Fonctions utilitaires pour la pagination et la génération
 * automatique du numéro étudiant.
 * ---------------------------------------------------------------
 */

import { PaginationMeta } from '../types';
import Student from '../models/student.model';

// ---------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------

export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}

export function parsePagination(
  rawPage?: string,
  rawLimit?: string
): { page: number; limit: number } {
  const page = Math.max(1, parseInt(rawPage ?? '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? '20', 10) || 20));
  return { page, limit };
}

// ---------------------------------------------------------------
// Génération automatique du numéro étudiant
// ---------------------------------------------------------------

/**
 * Génère un numéro étudiant unique au format STU-YYYY-NNNN.
 * Ex : STU-2024-0042
 *
 * Séquentiel par année d'inscription pour garantir l'unicité
 * et la lisibilité humaine du numéro.
 *
 * @param enrollmentYear - Année d'inscription (ex : 2024)
 * @returns Numéro étudiant unique formaté
 */
export async function generateStudentNumber(enrollmentYear: number): Promise<string> {
  // Compter le nombre d'étudiants inscrits cette année pour l'incrément
  const count = await Student.count({
    where: { enrollmentYear },
  });

  const sequence = String(count + 1).padStart(4, '0');
  return `STU-${enrollmentYear}-${sequence}`;
}
