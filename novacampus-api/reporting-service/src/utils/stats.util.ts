/**
 * utils/stats.util.ts
 * ---------------------------------------------------------------
 * Fonctions utilitaires pour la pagination et les calculs
 * statistiques utilisés dans les rapports.
 * ---------------------------------------------------------------
 */

import { PaginationMeta } from '../types';

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
// Calculs statistiques
// ---------------------------------------------------------------

/**
 * Calcule la moyenne d'un tableau de nombres.
 * Retourne 0 si le tableau est vide.
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return roundDecimal(sum / values.length, 2);
}

/**
 * Arrondit un nombre à N décimales.
 */
export function roundDecimal(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Calcule un pourcentage arrondi à 2 décimales.
 * Retourne 0 si le dénominateur est 0.
 */
export function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return roundDecimal((numerator / denominator) * 100, 2);
}

/**
 * Normalise un score entre 0 et 1 selon un min et max attendus.
 * Utilisé pour normaliser les métriques de risque IA.
 */
export function normalizeScore(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) return 0;
  const normalized = (value - min) / (max - min);
  return Math.max(0, Math.min(1, roundDecimal(normalized, 3)));
}

/**
 * Détermine la sévérité d'une alerte selon un score normalisé.
 */
export function scoreToBySeverity(
  score: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 0.85) return 'critical';
  if (score >= 0.70) return 'high';
  if (score >= 0.50) return 'medium';
  return 'low';
}

/**
 * Vérifie si un cache est encore valide selon sa date de calcul.
 *
 * @param computedAt  - Date de calcul du snapshot
 * @param ttlMinutes  - Durée de vie en minutes
 * @returns true si le cache est encore frais
 */
export function isCacheValid(computedAt: Date, ttlMinutes: number): boolean {
  const ageMs = Date.now() - computedAt.getTime();
  return ageMs < ttlMinutes * 60 * 1000;
}
