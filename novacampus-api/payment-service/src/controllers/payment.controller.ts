/**
 * controllers/payment.controller.ts
 * ---------------------------------------------------------------
 * Contrôleurs pour toutes les ressources du service paiements.
 *
 * Organisation :
 *   – Invoices  : CRUD factures, enregistrement paiement, overdue
 *   – Reminders : relances unitaires, batch, stats
 *   – Reporting : statistiques financières direction/admin
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as InvoiceService from '../services/invoice.service';
import * as ReminderService from '../services/reminder.service';

// ═══════════════════════════════════════════════
// FACTURES
// ═══════════════════════════════════════════════

/** GET /api/invoices/me – Mes factures (étudiant connecté) */
export async function getMyInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    // L'étudiant utilise son userId JWT – le service retrouve son studentId
    const invoices = await InvoiceService.getMyInvoices(req.user!.id);
    res.status(200).json({ status: 'success', data: { invoices } });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_MY_INVOICES', message: (err as Error).message });
  }
}

/** GET /api/invoices – Toutes les factures (admin/direction) */
export async function listInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await InvoiceService.listInvoices(req.query as Record<string, string>);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_LIST_INVOICES', message: (err as Error).message });
  }
}

/** GET /api/invoices/:id – Détail d'une facture + relances */
export async function getInvoiceById(req: AuthenticatedRequest, res: Response) {
  try {
    const invoice = await InvoiceService.getInvoiceById(req.params.id);
    res.status(200).json({ status: 'success', data: invoice });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_INVOICE_NOT_FOUND', message: (err as Error).message });
  }
}

/** POST /api/invoices – Créer une facture */
export async function createInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const { invoiceDate, dueDate, ...rest } = req.body;
    const invoice = await InvoiceService.createInvoice({
      ...rest,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
    });
    res.status(201).json({ status: 'success', data: invoice });
  } catch (err) {
    res.status(400).json({ status: 'failure', code: 'ERR_CREATE_INVOICE', message: (err as Error).message });
  }
}

/** PATCH /api/invoices/:id/pay – Enregistrer un paiement reçu */
export async function recordPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const { paymentMethod, paidAt, reference } = req.body;
    const invoice = await InvoiceService.recordPayment(req.params.id, {
      paymentMethod,
      paidAt: paidAt ? new Date(paidAt) : undefined,
      reference,
    });
    res.status(200).json({ status: 'success', data: invoice });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_RECORD_PAYMENT', message: (err as Error).message });
  }
}

/** PATCH /api/invoices/:id/cancel – Annuler une facture */
export async function cancelInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const invoice = await InvoiceService.cancelInvoice(req.params.id);
    res.status(200).json({ status: 'success', data: invoice });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_CANCEL_INVOICE', message: (err as Error).message });
  }
}

/** POST /api/invoices/mark-overdue – Marquer les retards (cron) */
export async function markOverdue(req: AuthenticatedRequest, res: Response) {
  try {
    const count = await InvoiceService.markOverdueInvoices();
    res.status(200).json({
      status: 'success',
      message: `${count} facture(s) marquée(s) en retard.`,
      data: { updatedCount: count },
    });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_MARK_OVERDUE', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// RELANCES
// ═══════════════════════════════════════════════

/** POST /api/invoices/:id/reminders – Relance unitaire manuelle */
export async function sendReminder(req: AuthenticatedRequest, res: Response) {
  try {
    const { channel, content } = req.body;
    const reminder = await ReminderService.sendReminder(
      req.params.id,
      channel,
      'manual',
      content
    );
    res.status(201).json({ status: 'success', data: reminder });
  } catch (err) {
    const status = (err as Error).message.includes('introuvable') ? 404 : 400;
    res.status(status).json({ status: 'failure', code: 'ERR_SEND_REMINDER', message: (err as Error).message });
  }
}

/** GET /api/invoices/:id/reminders – Historique des relances */
export async function getRemindersByInvoice(req: AuthenticatedRequest, res: Response) {
  try {
    const reminders = await ReminderService.getRemindersByInvoice(req.params.id);
    res.status(200).json({ status: 'success', data: { reminders } });
  } catch (err) {
    res.status(404).json({ status: 'failure', code: 'ERR_GET_REMINDERS', message: (err as Error).message });
  }
}

/** POST /api/invoices/reminders/batch – Relances batch (admin ou IA) */
export async function sendBatchReminders(req: AuthenticatedRequest, res: Response) {
  try {
    const { channel, trigger, campusId } = req.body;
    const result = await ReminderService.sendBatchReminders(channel, trigger, campusId);
    res.status(200).json({
      status: 'success',
      data: result,
      message: `Batch terminé : ${result.sent} relance(s) envoyée(s).`,
    });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_BATCH_REMINDERS', message: (err as Error).message });
  }
}

// ═══════════════════════════════════════════════
// REPORTING FINANCIER
// ═══════════════════════════════════════════════

/** GET /api/payments/stats – KPIs financiers (direction) */
export async function getFinancialStats(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId, academicYear } = req.query as Record<string, string>;
    const stats = await InvoiceService.getFinancialStats(
      campusId,
      academicYear ? parseInt(academicYear, 10) : undefined
    );
    res.status(200).json({ status: 'success', data: stats });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_FINANCIAL_STATS', message: (err as Error).message });
  }
}

/** GET /api/payments/reminders/stats – Stats des relances */
export async function getReminderStats(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId } = req.query as Record<string, string>;
    const stats = await ReminderService.getReminderStats(campusId);
    res.status(200).json({ status: 'success', data: stats });
  } catch (err) {
    res.status(500).json({ status: 'failure', code: 'ERR_REMINDER_STATS', message: (err as Error).message });
  }
}
