/**
 * services/invoice.service.ts
 * ---------------------------------------------------------------
 * CORRECTION APPLIQUÉE :
 *   syncPaymentStatusToInscription() — retry avec backoff exponentiel
 *   AVANT : 1 seul appel, échec silencieux si inscription-service down
 *   APRÈS : 3 tentatives (1s → 2s → 4s), log d'erreur persistant si tout échoue
 * ---------------------------------------------------------------
 */

import { Op, WhereOptions } from 'sequelize';
import Invoice from '../models/invoice.model';
import PaymentReminder from '../models/paymentReminder.model';
import { InvoiceStatus, PaymentMethod, FinancialStats } from '../types';
import {
  parsePagination,
  getOffset,
  buildPaginationMeta,
  roundDecimal,
  isOverdue,
  collectionRate,
} from '../utils/finance.util';

// ---------------------------------------------------------------
// CORRECTION : Retry avec backoff exponentiel
// ---------------------------------------------------------------

const MAX_SYNC_ATTEMPTS = 3;
const INSCRIPTION_SERVICE_URL = process.env.INSCRIPTION_SERVICE_URL ?? 'http://inscription-service:3004';

/**
 * Synchronise le statut de paiement vers l'inscription-service
 * avec retry automatique en cas d'indisponibilité temporaire.
 *
 * Stratégie : backoff exponentiel — 1s, 2s, 4s entre les tentatives.
 * Non bloquant : l'enregistrement du paiement réussit même si la sync échoue.
 *
 * AVANT : 1 appel, try/catch unique, échec silencieux
 * APRÈS : 3 tentatives avec délai croissant + log d'erreur explicite
 */
async function syncPaymentStatusToInscription(
  studentId: string,
  paymentStatus: 'up_to_date' | 'pending' | 'overdue'
): Promise<void> {
  const url = `${INSCRIPTION_SERVICE_URL}/api/students/${studentId}/payment-status`;

  for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service': 'payment-service',
        },
        body: JSON.stringify({ paymentStatus }),
      });

      if (response.ok) {
        if (attempt > 1) {
          console.log(`[PaymentService] Sync réussie à la tentative ${attempt} pour ${studentId}`);
        }
        return; // Succès — sortir de la boucle
      }

      console.warn(
        `[PaymentService] Sync tentative ${attempt}/${MAX_SYNC_ATTEMPTS} échouée — HTTP ${response.status} pour ${studentId}`
      );
    } catch (err) {
      console.warn(
        `[PaymentService] Sync tentative ${attempt}/${MAX_SYNC_ATTEMPTS} — réseau indisponible: ${(err as Error).message}`
      );
    }

    // Backoff exponentiel avant la prochaine tentative (sauf après la dernière)
    if (attempt < MAX_SYNC_ATTEMPTS) {
      const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Toutes les tentatives ont échoué — log persistant pour investigation
  console.error(
    `[PaymentService] SYNC ÉCHOUÉE définitivement pour studentId=${studentId} status=${paymentStatus}. ` +
    `L'inscription-service était indisponible après ${MAX_SYNC_ATTEMPTS} tentatives. ` +
    `Action manuelle requise ou réconciliation via cron.`
  );
  // TODO production : publier un événement dans une dead-letter queue
  // ou écrire dans une table payment_sync_failures pour réconciliation
}

/**
 * Détermine le statut de paiement global d'un étudiant.
 */
async function computeStudentPaymentStatus(
  studentId: string
): Promise<'up_to_date' | 'pending' | 'overdue'> {
  const hasOverdue = await Invoice.count({ where: { studentId, status: 'overdue' } });
  if (hasOverdue > 0) return 'overdue';

  const hasPending = await Invoice.count({ where: { studentId, status: 'pending' } });
  if (hasPending > 0) return 'pending';

  return 'up_to_date';
}

// ---------------------------------------------------------------
// CRUD Factures (inchangé)
// ---------------------------------------------------------------

export async function listInvoices(query: Record<string, string>) {
  const { studentId, campusId, programId, status, academicYear, semester, page: p, limit: l } = query;
  const { page, limit } = parsePagination(p, l);
  const where: WhereOptions = {};

  if (studentId)    where['studentId']    = studentId;
  if (campusId)     where['campusId']     = campusId;
  if (programId)    where['programId']    = programId;
  if (status)       where['status']       = status as InvoiceStatus;
  if (academicYear) where['academicYear'] = parseInt(academicYear, 10);
  if (semester)     where['semester']     = parseInt(semester, 10);

  const { count, rows } = await Invoice.findAndCountAll({
    where,
    limit,
    offset: getOffset(page, limit),
    order: [['dueDate', 'DESC']],
  });

  return { invoices: rows, meta: buildPaginationMeta(count, page, limit) };
}

export async function getInvoiceById(id: string) {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) throw new Error('Facture introuvable.');

  const reminders = await PaymentReminder.findAll({
    where: { invoiceId: id },
    order: [['sentAt', 'DESC']],
  });

  return { ...invoice.toJSON(), reminders };
}

export async function getMyInvoices(studentId: string) {
  return Invoice.findAll({
    where: { studentId },
    order: [['academicYear', 'DESC'], ['semester', 'DESC']],
  });
}

export async function createInvoice(data: {
  studentId: string;
  programId: string;
  campusId: string;
  academicYear: number;
  semester: number;
  amount: number;
  invoiceDate: Date;
  dueDate: Date;
}) {
  const existing = await Invoice.findOne({
    where: {
      studentId: data.studentId,
      academicYear: data.academicYear,
      semester: data.semester,
      status: { [Op.ne]: 'cancelled' },
    },
  });
  if (existing) {
    throw new Error(`Une facture existe déjà pour cet étudiant sur ${data.academicYear} S${data.semester}.`);
  }

  return Invoice.create({ ...data, amount: roundDecimal(data.amount), status: 'pending' });
}

export async function recordPayment(
  invoiceId: string,
  data: { paymentMethod: PaymentMethod; paidAt?: Date; reference?: string }
) {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) throw new Error('Facture introuvable.');
  if (invoice.status === 'paid')      throw new Error('Cette facture est déjà réglée.');
  if (invoice.status === 'cancelled') throw new Error('Impossible d\'enregistrer un paiement sur une facture annulée.');

  await invoice.update({
    status: 'paid',
    paidAt: data.paidAt ?? new Date(),
    paymentMethod: data.paymentMethod,
    reference: data.reference ?? null,
  });

  // CORRECTION : sync avec retry — ne bloque pas la réponse HTTP
  const newStatus = await computeStudentPaymentStatus(invoice.studentId);
  syncPaymentStatusToInscription(invoice.studentId, newStatus).catch(() => {
    // Erreur déjà loggée dans syncPaymentStatusToInscription
  });

  return invoice;
}

export async function markOverdueInvoices(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [updated] = await Invoice.update(
    { status: 'overdue' },
    { where: { status: 'pending', dueDate: { [Op.lt]: today } } }
  );

  if (updated > 0) {
    console.log(`[PaymentService] ${updated} facture(s) marquée(s) en retard.`);

    const overdueInvoices = await Invoice.findAll({
      where: { status: 'overdue' },
      attributes: ['studentId'],
      group: ['studentId'],
    });

    // CORRECTION : sync avec retry pour chaque étudiant concerné
    await Promise.allSettled(
      overdueInvoices.map((inv) =>
        syncPaymentStatusToInscription(inv.studentId, 'overdue')
      )
    );
  }

  return updated;
}

export async function cancelInvoice(invoiceId: string) {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) throw new Error('Facture introuvable.');
  if (invoice.status === 'paid') throw new Error('Une facture réglée ne peut pas être annulée.');

  await invoice.update({ status: 'cancelled' });

  // CORRECTION : sync avec retry
  const newStatus = await computeStudentPaymentStatus(invoice.studentId);
  syncPaymentStatusToInscription(invoice.studentId, newStatus).catch(() => {});

  return invoice;
}

export async function getFinancialStats(
  campusId?: string,
  academicYear?: number
): Promise<FinancialStats> {
  const where: WhereOptions = {};
  if (campusId)     where['campusId']     = campusId;
  if (academicYear) where['academicYear'] = academicYear;

  const activeWhere = { ...where, status: { [Op.ne]: 'cancelled' } };
  const invoices = await Invoice.findAll({ where: activeWhere });

  const totalInvoiced   = invoices.reduce((s, i) => s + Number(i.amount), 0);
  const totalCollected  = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0);
  const totalPending    = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + Number(i.amount), 0);
  const totalOverdue    = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0);
  const paidCount       = invoices.filter((i) => i.status === 'paid').length;
  const pendingCount    = invoices.filter((i) => i.status === 'pending').length;
  const overdueCount    = invoices.filter((i) => i.status === 'overdue').length;

  return {
    campusId:       campusId ?? null,
    academicYear:   academicYear ?? null,
    totalInvoiced:  roundDecimal(totalInvoiced),
    totalCollected: roundDecimal(totalCollected),
    totalPending:   roundDecimal(totalPending),
    totalOverdue:   roundDecimal(totalOverdue),
    collectionRate: collectionRate(totalCollected, totalInvoiced),
    overdueRate:    collectionRate(totalOverdue, totalInvoiced),
    invoiceCount:   invoices.length,
    paidCount,
    pendingCount,
    overdueCount,
  };
}
