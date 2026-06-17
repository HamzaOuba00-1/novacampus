/**
 * services/aiAlert.service.ts
 * ---------------------------------------------------------------
 * Service de gestion des alertes générées par l'agent IA.
 *
 * Couvre :
 *   – Listing avec filtres (statut, type, sévérité, campus)
 *   – Traitement d'une alerte (actioned/dismissed)
 *   – Déclenchement d'une analyse IA manuelle
 *   – Statistiques des alertes pour le reporting
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import AiAlert from '../models/aiAlert.model';
import { runAnalysis, generateInsightsSummary } from '../ai/agent';
import { parsePagination, getOffset, buildPaginationMeta } from '../utils/stats.util';
import { AiAlertStatus, AiAlertType, AiAlertSeverity, AiAnalysisResult } from '../types';

/**
 * Liste les alertes IA avec filtres et pagination.
 */
export async function listAlerts(query: Record<string, string>) {
  const { status, type, severity, campusId, studentId, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);

  const where: WhereOptions = {};
  if (status) where['status'] = status as AiAlertStatus;
  if (type) where['type'] = type as AiAlertType;
  if (severity) where['severity'] = severity as AiAlertSeverity;
  if (campusId) where['campusId'] = campusId;
  if (studentId) where['studentId'] = studentId;

  const { count, rows } = await AiAlert.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [
      // Trier par sévérité décroissante puis par date
      ['severity', 'DESC'],
      ['createdAt', 'DESC'],
    ],
  });

  return { alerts: rows, meta: buildPaginationMeta(count, page, limit) };
}

/**
 * Récupère une alerte par son identifiant.
 */
export async function getAlertById(id: string) {
  const alert = await AiAlert.findByPk(id);
  if (!alert) throw new Error('Alerte introuvable.');
  return alert;
}

/**
 * Traite une alerte (actioned ou dismissed).
 * Enregistre l'administrateur ayant traité l'alerte.
 */
export async function updateAlertStatus(
  alertId: string,
  actorId: string,
  status: 'actioned' | 'dismissed',
  note?: string
) {
  const alert = await AiAlert.findByPk(alertId);
  if (!alert) throw new Error('Alerte introuvable.');
  if (alert.status !== 'open') throw new Error('Cette alerte a déjà été traitée.');

  return alert.update({
    status,
    actionedBy: actorId,
    actionNote: note ?? null,
  });
}

/**
 * Déclenche une analyse IA (manuelle depuis le dashboard direction/admin).
 * L'analyse est synchrone pour les scopes limités, asynchrone pour global.
 *
 * @param scope    - 'campus' | 'global'
 * @param targetId - UUID du campus si scope='campus'
 * @param actorId  - UUID de l'utilisateur déclencheur
 */
export async function triggerAnalysis(
  scope: 'campus' | 'global',
  actorId: string,
  targetId?: string
): Promise<AiAnalysisResult> {
  const campusId = scope === 'campus' ? (targetId ?? null) : null;
  return runAnalysis(campusId, actorId);
}

/**
 * Génère la synthèse narrative IA pour la direction.
 */
export async function getInsightsSummary(
  campusId: string | null,
  academicYear: number
): Promise<string> {
  return generateInsightsSummary(campusId, academicYear);
}

/**
 * Statistiques des alertes pour le dashboard admin/direction.
 */
export async function getAlertStats(campusId?: string) {
  const where: WhereOptions = {};
  if (campusId) where['campusId'] = campusId;

  const [total, open, actioned, dismissed, bySeverity, byType] = await Promise.all([
    AiAlert.count({ where }),
    AiAlert.count({ where: { ...where, status: 'open' } }),
    AiAlert.count({ where: { ...where, status: 'actioned' } }),
    AiAlert.count({ where: { ...where, status: 'dismissed' } }),
    // Alertes ouvertes par sévérité
    AiAlert.findAll({
      where: { ...where, status: 'open' },
      attributes: ['severity'],
      group: ['severity'],
    }),
    // Alertes ouvertes par type
    AiAlert.findAll({
      where: { ...where, status: 'open' },
      attributes: ['type'],
      group: ['type'],
    }),
  ]);

  return {
    total,
    open,
    actioned,
    dismissed,
    bySeverity: Object.fromEntries(bySeverity.map((a) => [a.severity, 1])),
    byType: Object.fromEntries(byType.map((a) => [a.type, 1])),
  };
}

/**
 * Retourne les étudiants à risque pour le tableau de bord admin.
 * Filtre les alertes ouvertes de type dropout_risk ou low_attendance.
 */
export async function getAtRiskStudents(campusId?: string, limit = 20) {
  const where: WhereOptions = {
    status: 'open',
    type: { [Op.in]: ['dropout_risk', 'low_attendance', 'payment_risk'] },
  };
  if (campusId) where['campusId'] = campusId;

  return AiAlert.findAll({
    where,
    limit,
    order: [['severity', 'DESC'], ['score', 'DESC']],
  });
}
