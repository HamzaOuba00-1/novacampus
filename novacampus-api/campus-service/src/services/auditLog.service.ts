/**
 * services/auditLog.service.ts
 * ---------------------------------------------------------------
 * Service de gestion du journal d'audit immuable.
 *
 * Point d'entrée unique pour TOUS les microservices :
 *   POST /api/audit/log  → createAuditEntry()
 *
 * Les autres services appellent cet endpoint après chaque
 * action critique pour centraliser la traçabilité.
 *
 * Règles absolues :
 *   – Jamais de UPDATE ou DELETE sur audit_logs
 *   – Chaque entrée est append-only et horodatée automatiquement
 *   – Les entrées peuvent être lues mais jamais modifiées
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import AuditLog from '../models/auditLog.model';
import { AuditEntry } from '../types';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/pagination.util';

/**
 * Crée une entrée d'audit (append-only).
 * Utilisée en interne par les services de ce module ET
 * exposée via l'API pour les appels inter-services.
 *
 * @param entry - Données de l'entrée d'audit
 */
export async function createAuditEntry(entry: AuditEntry) {
  return AuditLog.create({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    beforeState: entry.beforeState ?? null,
    afterState: entry.afterState ?? null,
    ipAddress: entry.ipAddress ?? null,
    campusId: entry.campusId ?? null,
  });
}

/**
 * Liste les entrées d'audit avec filtres et pagination.
 *
 * Filtres disponibles :
 *   – actorId   : actions d'un utilisateur spécifique
 *   – action    : type d'action (grade.create, invoice.pay…)
 *   – entityType: entité concernée (Grade, Invoice…)
 *   – entityId  : entrées concernant une entité précise
 *   – campusId  : entrées d'un campus spécifique
 *   – dateFrom  : date de début (YYYY-MM-DD)
 *   – dateTo    : date de fin (YYYY-MM-DD)
 */
export async function listAuditLogs(query: Record<string, string>) {
  const {
    actorId,
    action,
    entityType,
    entityId,
    campusId,
    dateFrom,
    dateTo,
    page: p,
    limit: l,
  } = query;

  const { page, limit } = parsePagination(p, l);
  const where: WhereOptions = {};

  if (actorId) where['actorId'] = actorId;
  if (action) where['action'] = action;
  if (entityType) where['entityType'] = entityType;
  if (entityId) where['entityId'] = entityId;
  if (campusId) where['campusId'] = campusId;

  // Filtre sur la plage de dates
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter[Op.gte as unknown as string] = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      dateFilter[Op.lte as unknown as string] = end;
    }
    where['createdAt'] = dateFilter;
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    // Toujours du plus récent au plus ancien
    order: [['createdAt', 'DESC']],
  });

  return { logs: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Retourne l'historique complet d'une entité précise.
 * Utile pour afficher "qui a modifié cette note et quand".
 *
 * @param entityType - Nom du modèle : "Grade", "Invoice"…
 * @param entityId   - UUID de l'entité
 */
export async function getEntityHistory(entityType: string, entityId: string) {
  return AuditLog.findAll({
    where: { entityType, entityId },
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Statistiques de l'audit log pour le tableau de bord direction.
 * Retourne les compteurs par type d'action sur les 30 derniers jours.
 */
export async function getAuditStats(campusId?: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const where: WhereOptions = {
    createdAt: { [Op.gte]: since },
  };
  if (campusId) where['campusId'] = campusId;

  const logs = await AuditLog.findAll({
    where,
    attributes: ['action'],
  });

  // Agrégation par type d'action
  const byAction: Record<string, number> = {};
  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] ?? 0) + 1;
  }

  return {
    period: 'last_30_days',
    total: logs.length,
    byAction,
  };
}
