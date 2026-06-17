/**
 * utils/pagination.util.ts
 * ---------------------------------------------------------------
 * Fonctions utilitaires pour la pagination des collections.
 * ---------------------------------------------------------------
 */

import { PaginationMeta } from '../types';

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
