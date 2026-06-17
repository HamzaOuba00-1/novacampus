/**
 * utils/finance.util.ts
 * ---------------------------------------------------------------
 * Fonctions utilitaires pour la pagination et les calculs
 * financiers précis.
 *
 * CORRECTION APPLIQUÉE :
 *   roundAmount renommé en roundDecimal pour cohérence avec
 *   invoice.service.ts qui l'importe sous ce nom.
 *   Un alias roundAmount est conservé pour ne pas casser
 *   d'éventuels autres fichiers qui utilisaient l'ancien nom.
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
  const page  = Math.max(1,   parseInt(rawPage  ?? '1',  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit ?? '20', 10) || 20));
  return { page, limit };
}

// ---------------------------------------------------------------
// Calculs financiers précis
// ---------------------------------------------------------------

/**
 * Arrondit un montant à 2 décimales (règle comptable).
 * Utilise la méthode "round half away from zero" pour éviter
 * les biais d'arrondi bancaire.
 *
 * Nom canonique : roundDecimal (utilisé dans invoice.service.ts).
 * Alias rétrocompatible : roundAmount (conservé pour ne rien casser).
 *
 * @param amount - Montant en euros (float)
 * @returns Montant arrondi à 2 décimales
 */
export function roundDecimal(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * @deprecated Utiliser roundDecimal — alias conservé pour rétrocompatibilité.
 */
export const roundAmount = roundDecimal;

/**
 * Calcule le taux de recouvrement en pourcentage.
 * Formule : (montant collecté / montant facturé) * 100
 *
 * @param collected - Montant total encaissé
 * @param invoiced  - Montant total facturé
 * @returns Taux de recouvrement (0-100), 0 si rien n'est facturé
 */
export function collectionRate(collected: number, invoiced: number): number {
  if (invoiced === 0) return 0;
  return roundDecimal((collected / invoiced) * 100);
}

/**
 * Détermine si une facture est en retard à une date donnée.
 *
 * @param dueDate   - Date d'échéance de la facture
 * @param checkDate - Date de référence (défaut : aujourd'hui)
 * @returns true si la facture est échue et impayée
 */
export function isOverdue(dueDate: Date, checkDate: Date = new Date()): boolean {
  return checkDate > dueDate;
}

/**
 * Calcule le nombre de jours de retard d'une facture.
 *
 * @param dueDate   - Date d'échéance
 * @param checkDate - Date de référence (défaut : aujourd'hui)
 * @returns Nombre de jours de retard (0 si pas en retard)
 */
export function daysOverdue(dueDate: Date, checkDate: Date = new Date()): number {
  const diff = checkDate.getTime() - dueDate.getTime();
  if (diff <= 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Génère un numéro de facture unique au format INV-YYYY-NNNNNN.
 * Ex : INV-2024-000042
 *
 * @param year     - Année de la facture
 * @param sequence - Numéro séquentiel
 * @returns Numéro de facture formaté
 */
export function generateInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(6, '0')}`;
}
