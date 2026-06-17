/**
 * services/reminder.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour les relances de paiement.
 *
 * Trois modes de déclenchement :
 *   1. Manuel    : admin sélectionne une facture → relance immédiate
 *   2. Batch     : cron ou admin → relances sur toutes les factures
 *                  overdue selon leur niveau de retard
 *   3. Agent IA  : même logique que batch mais triggeredBy='ai_agent'
 *                  et avec un message personnalisé généré
 *
 * Niveaux de relance (configurables via .env) :
 *   Niveau 1 (J+7)  : rappel amiable par email
 *   Niveau 2 (J+15) : relance formelle par email + SMS
 *   Niveau 3 (J+30) : mise en demeure par courrier
 * ---------------------------------------------------------------
 */

import { Op } from 'sequelize';
import Invoice from '../models/invoice.model';
import PaymentReminder from '../models/paymentReminder.model';
import { ReminderChannel, ReminderTrigger } from '../types';
import { daysOverdue } from '../utils/finance.util';

// Seuils de retard par niveau (jours après échéance)
const LEVEL1_DAYS = parseInt(process.env.REMINDER_LEVEL1_DAYS ?? '7', 10);
const LEVEL2_DAYS = parseInt(process.env.REMINDER_LEVEL2_DAYS ?? '15', 10);
const LEVEL3_DAYS = parseInt(process.env.REMINDER_LEVEL3_DAYS ?? '30', 10);

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/**
 * Génère le contenu du message de relance selon le niveau.
 * En production, ce texte proviendrait d'un template configurable.
 */
function buildReminderContent(
  level: number,
  invoiceAmount: number,
  dueDate: Date
): string {
  const dueDateStr = dueDate.toLocaleDateString('fr-FR');
  const amountStr = `${Number(invoiceAmount).toFixed(2)} €`;

  switch (level) {
    case 1:
      return `Rappel : votre facture de ${amountStr} était due le ${dueDateStr}. Merci de procéder au règlement dans les meilleurs délais.`;
    case 2:
      return `RELANCE : malgré notre précédent rappel, votre facture de ${amountStr} (échue le ${dueDateStr}) reste impayée. Veuillez régulariser votre situation sous 8 jours.`;
    case 3:
      return `MISE EN DEMEURE : en l'absence de règlement de votre facture de ${amountStr} (échue le ${dueDateStr}), votre dossier sera transmis au service contentieux. Dernier délai : 15 jours.`;
    default:
      return `Votre facture de ${amountStr} (due le ${dueDateStr}) est toujours impayée. Veuillez contacter l'administration.`;
  }
}

/**
 * Détermine le niveau de relance approprié selon le nombre de jours de retard
 * et le nombre de relances déjà envoyées.
 */
function computeReminderLevel(days: number, existingCount: number): number {
  // Progression basée sur le retard ET le nombre de relances déjà envoyées
  if (days >= LEVEL3_DAYS) return Math.min(3, existingCount + 1);
  if (days >= LEVEL2_DAYS) return Math.min(2, existingCount + 1);
  if (days >= LEVEL1_DAYS) return Math.min(1, existingCount + 1);
  return 0; // Pas encore de relance nécessaire
}

// ---------------------------------------------------------------
// Relance unitaire
// ---------------------------------------------------------------

/**
 * Déclenche une relance manuelle pour une facture spécifique.
 * L'admin choisit le canal et le niveau est calculé automatiquement.
 */
export async function sendReminder(
  invoiceId: string,
  channel: ReminderChannel,
  triggeredBy: ReminderTrigger = 'manual',
  customContent?: string
) {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) throw new Error('Facture introuvable.');

  if (invoice.status === 'paid') throw new Error('Cette facture est déjà réglée.');
  if (invoice.status === 'cancelled') throw new Error('Impossible de relancer une facture annulée.');

  // Calculer le niveau de relance approprié
  const existingReminders = await PaymentReminder.count({ where: { invoiceId } });
  const days = daysOverdue(new Date(invoice.dueDate));
  const level = computeReminderLevel(days, existingReminders);

  if (level === 0 && triggeredBy !== 'manual') {
    throw new Error('La facture n\'est pas encore éligible à une relance automatique.');
  }

  const effectiveLevel = level || (existingReminders + 1);
  const content = customContent ?? buildReminderContent(
    effectiveLevel,
    Number(invoice.amount),
    new Date(invoice.dueDate)
  );

  const reminder = await PaymentReminder.create({
    invoiceId,
    level: effectiveLevel,
    channel,
    triggeredBy,
    contentSnapshot: content,
  });

  // Simulation de l'envoi (à remplacer par un vrai service d'email/SMS)
  console.log(`[ReminderService] Relance niveau ${effectiveLevel} envoyée par ${channel} (${triggeredBy})`);
  console.log(`[ReminderService] Contenu : ${content.substring(0, 80)}...`);

  return reminder;
}

// ---------------------------------------------------------------
// Relances en batch
// ---------------------------------------------------------------

/**
 * Traite toutes les factures en retard et envoie les relances
 * appropriées selon leur niveau de retard.
 *
 * Utilisé par :
 *   – Le cron planifié quotidien (triggeredBy: 'scheduled')
 *   – L'agent IA (triggeredBy: 'ai_agent')
 *   – L'admin via l'interface (triggeredBy: 'manual')
 *
 * @param channel    - Canal d'envoi pour cette session de relances
 * @param triggeredBy - Déclencheur
 * @param campusId   - Filtrer par campus (optionnel)
 * @returns Statistiques du batch
 */
export async function sendBatchReminders(
  channel: ReminderChannel,
  triggeredBy: ReminderTrigger,
  campusId?: string
): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  const where: Record<string, unknown> = {
    status: { [Op.in]: ['pending', 'overdue'] },
    dueDate: { [Op.lt]: new Date() },
  };
  if (campusId) where['campusId'] = campusId;

  const overdueInvoices = await Invoice.findAll({ where });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const invoice of overdueInvoices) {
    try {
      const existingCount = await PaymentReminder.count({
        where: { invoiceId: invoice.id },
      });

      const days = daysOverdue(new Date(invoice.dueDate));
      const level = computeReminderLevel(days, existingCount);

      if (level === 0) {
        skipped++;
        continue;
      }

      // Éviter de renvoyer le même niveau de relance si déjà envoyé récemment (24h)
      const recentReminder = await PaymentReminder.findOne({
        where: {
          invoiceId: invoice.id,
          level,
          sentAt: { [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (recentReminder) {
        skipped++;
        continue;
      }

      const content = buildReminderContent(level, Number(invoice.amount), new Date(invoice.dueDate));

      await PaymentReminder.create({
        invoiceId: invoice.id,
        level,
        channel,
        triggeredBy,
        contentSnapshot: content,
      });

      sent++;
    } catch (err) {
      console.error(`[BatchReminder] Erreur sur facture ${invoice.id}:`, (err as Error).message);
      errors++;
    }
  }

  console.log(`[BatchReminder] Batch ${triggeredBy} terminé : ${sent} envoyées, ${skipped} ignorées, ${errors} erreurs.`);

  return { processed: overdueInvoices.length, sent, skipped, errors };
}

// ---------------------------------------------------------------
// Consultation
// ---------------------------------------------------------------

/**
 * Retourne l'historique des relances pour une facture.
 */
export async function getRemindersByInvoice(invoiceId: string) {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) throw new Error('Facture introuvable.');

  return PaymentReminder.findAll({
    where: { invoiceId },
    order: [['sentAt', 'DESC']],
  });
}

/**
 * Statistiques globales des relances (pour le tableau de bord admin).
 */
export async function getReminderStats(campusId?: string): Promise<{
  total: number;
  byLevel: Record<number, number>;
  byTrigger: Record<string, number>;
  byChannel: Record<string, number>;
}> {
  // Filtrer via les factures si campusId est fourni
  let invoiceIds: string[] | undefined;
  if (campusId) {
    const invoices = await Invoice.findAll({
      where: { campusId },
      attributes: ['id'],
    });
    invoiceIds = invoices.map((i) => i.id);
  }

  const where: Record<string, unknown> = {};
  if (invoiceIds) where['invoiceId'] = { [Op.in]: invoiceIds };

  const reminders = await PaymentReminder.findAll({ where });

  const byLevel: Record<number, number> = {};
  const byTrigger: Record<string, number> = {};
  const byChannel: Record<string, number> = {};

  for (const r of reminders) {
    byLevel[r.level] = (byLevel[r.level] ?? 0) + 1;
    byTrigger[r.triggeredBy] = (byTrigger[r.triggeredBy] ?? 0) + 1;
    byChannel[r.channel] = (byChannel[r.channel] ?? 0) + 1;
  }

  return { total: reminders.length, byLevel, byTrigger, byChannel };
}
