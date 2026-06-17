/**
 * services/globalConfig.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour la configuration globale du système ERP.
 *
 * Permet de modifier les paramètres opérationnels sans
 * redéploiement : seuils d'assiduité, délais de relance,
 * seuils de l'agent IA, messages système…
 *
 * Chaque modification est tracée dans l'audit log.
 * ---------------------------------------------------------------
 */

import GlobalConfig from '../models/globalConfig.model';
import { createAuditEntry } from './auditLog.service';

// ---------------------------------------------------------------
// Configuration par défaut du système
// Utilisée si aucune entrée en base ne correspond
// ---------------------------------------------------------------
export const DEFAULT_CONFIG: Record<string, string> = {
  'attendance.min_rate': '0.75',
  'attendance.risk_threshold': '0.50',
  'payment.reminder.level1_days': '7',
  'payment.reminder.level2_days': '15',
  'payment.reminder.level3_days': '30',
  'academic.passing_grade': '10.0',
  'ai.dropout_risk_threshold': '0.65',
  'ai.payment_risk_threshold': '0.70',
  'notification.batch_size': '10',
};

/**
 * Récupère toutes les configurations (globales + campus-spécifiques).
 *
 * @param campusId - Si fourni, retourne les configs globales + surcharges campus
 */
export async function listConfigs(campusId?: string) {
  const global = await GlobalConfig.findAll({
    where: { campusId: null },
    order: [['key', 'ASC']],
  });

  if (!campusId) return { configs: global };

  const campusOverrides = await GlobalConfig.findAll({
    where: { campusId },
    order: [['key', 'ASC']],
  });

  // Fusion : la surcharge campus prime sur la valeur globale
  const merged = new Map<string, GlobalConfig>();
  global.forEach((c) => merged.set(c.key, c));
  campusOverrides.forEach((c) => merged.set(c.key, c));

  return { configs: Array.from(merged.values()) };
}

/**
 * Récupère la valeur d'une configuration.
 * Priorité : config campus > config globale > valeur par défaut.
 *
 * @param key      - Clé de configuration
 * @param campusId - Campus concerné (optionnel)
 * @returns La valeur sous forme de string
 */
export async function getConfigValue(key: string, campusId?: string): Promise<string> {
  // 1. Chercher une surcharge campus
  if (campusId) {
    const campusConfig = await GlobalConfig.findOne({ where: { key, campusId } });
    if (campusConfig) return campusConfig.value;
  }

  // 2. Chercher la valeur globale
  const globalConfig = await GlobalConfig.findOne({ where: { key, campusId: null } });
  if (globalConfig) return globalConfig.value;

  // 3. Valeur par défaut hardcodée
  return DEFAULT_CONFIG[key] ?? '';
}

/**
 * Crée ou met à jour une configuration (upsert).
 * Trace la modification dans l'audit log.
 */
export async function upsertConfig(
  key: string,
  value: string,
  actorId: string,
  options?: {
    description?: string;
    campusId?: string;
    ipAddress?: string;
  }
) {
  const { description, campusId = null, ipAddress } = options ?? {};

  const existing = await GlobalConfig.findOne({
    where: { key, campusId: campusId ?? null },
  });

  const beforeState = existing ? { key, value: existing.value } : null;

  if (existing) {
    await existing.update({ value, updatedBy: actorId, description: description ?? existing.description });
  } else {
    await GlobalConfig.create({ key, value, description: description ?? null, campusId, updatedBy: actorId });
  }

  await createAuditEntry({
    actorId,
    action: 'config.update',
    entityType: 'GlobalConfig',
    entityId: key,
    beforeState,
    afterState: { key, value, campusId },
    ipAddress: ipAddress ?? null,
    campusId: campusId ?? null,
  });

  return { key, value, campusId };
}

/**
 * Supprime une configuration campus-spécifique.
 * La configuration globale reprend alors effet.
 */
export async function deleteConfig(key: string, campusId: string, actorId: string) {
  const config = await GlobalConfig.findOne({ where: { key, campusId } });
  if (!config) throw new Error(`Configuration "${key}" introuvable pour ce campus.`);

  await createAuditEntry({
    actorId,
    action: 'config.update',
    entityType: 'GlobalConfig',
    entityId: key,
    beforeState: { key, value: config.value, campusId },
    afterState: null,
    ipAddress: null,
    campusId,
  });

  await config.destroy();
}
