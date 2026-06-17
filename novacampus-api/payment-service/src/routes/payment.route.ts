/**
 * routes/payment.route.ts
 * ---------------------------------------------------------------
 * Définition complète des routes du service paiements.
 *
 * Toutes les routes sont protégées par authenticate.
 * Préfixe dans index.ts : /api
 * ---------------------------------------------------------------
 */

import { Router } from 'express';
import * as C from '../controllers/payment.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import {
  validateCreateInvoice,
  validateRecordPayment,
  validateCreateReminder,
  validateBatchReminders,
} from '../middlewares/validation.middleware';

const router = Router();
router.use(authenticate);

// ═══════════════════════════════════════════════
// ROUTES FIXES – à définir AVANT les routes paramétrées
// ═══════════════════════════════════════════════

/**
 * GET /api/invoices/me
 * Factures de l'étudiant connecté
 * Accès : student
 */
router.get('/invoices/me', requireRole('student'), C.getMyInvoices);

/**
 * POST /api/invoices/mark-overdue
 * Marquer automatiquement les factures échues en 'overdue'
 * Conçu pour être appelé par un cron job interne
 * Accès : admin uniquement
 */
router.post('/invoices/mark-overdue', requireRole('admin'), C.markOverdue);

/**
 * POST /api/invoices/reminders/batch
 * Déclencher les relances en masse sur toutes les factures en retard
 * Body : { channel, trigger: 'manual'|'ai_agent'|'scheduled', campusId? }
 * Accès : admin uniquement
 */
router.post(
  '/invoices/reminders/batch',
  requireRole('admin'),
  validateBatchReminders,
  C.sendBatchReminders
);

// ═══════════════════════════════════════════════
// FACTURES
// ═══════════════════════════════════════════════

/**
 * GET /api/invoices
 * Liste paginée avec filtres
 * Query : ?studentId=&campusId=&status=overdue&academicYear=2023&semester=1
 * Accès : admin, direction
 */
router.get('/invoices', requireRole('admin', 'direction'), C.listInvoices);

/**
 * GET /api/invoices/:id
 * Détail d'une facture + historique de relances
 * Accès : student (ses propres), admin, direction
 */
router.get('/invoices/:id', C.getInvoiceById);

/**
 * POST /api/invoices
 * Créer une facture semestrielle ou ponctuelle
 * Accès : admin uniquement
 */
router.post('/invoices', requireRole('admin'), validateCreateInvoice, C.createInvoice);

/**
 * PATCH /api/invoices/:id/pay
 * Enregistrer un paiement reçu
 * Body : { paymentMethod, paidAt?, reference? }
 * Accès : admin uniquement
 */
router.patch(
  '/invoices/:id/pay',
  requireRole('admin'),
  validateRecordPayment,
  C.recordPayment
);

/**
 * PATCH /api/invoices/:id/cancel
 * Annuler une facture (sauf si déjà réglée)
 * Accès : admin uniquement
 */
router.patch('/invoices/:id/cancel', requireRole('admin'), C.cancelInvoice);

// ═══════════════════════════════════════════════
// RELANCES
// ═══════════════════════════════════════════════

/**
 * GET /api/invoices/:id/reminders
 * Historique des relances d'une facture
 * Accès : admin, direction
 */
router.get(
  '/invoices/:id/reminders',
  requireRole('admin', 'direction'),
  C.getRemindersByInvoice
);

/**
 * POST /api/invoices/:id/reminders
 * Déclencher une relance manuelle sur une facture
 * Body : { channel: 'email'|'sms'|'letter', content? }
 * Accès : admin uniquement
 */
router.post(
  '/invoices/:id/reminders',
  requireRole('admin'),
  validateCreateReminder,
  C.sendReminder
);

// ═══════════════════════════════════════════════
// REPORTING FINANCIER
// ═══════════════════════════════════════════════

/**
 * GET /api/payments/stats
 * KPIs financiers agrégés
 * Query : ?campusId=&academicYear=2023
 * Accès : admin, direction
 */
router.get('/payments/stats', requireRole('admin', 'direction'), C.getFinancialStats);

/**
 * GET /api/payments/reminders/stats
 * Statistiques des relances (efficacité par niveau/canal/déclencheur)
 * Query : ?campusId=
 * Accès : admin, direction
 */
router.get(
  '/payments/reminders/stats',
  requireRole('admin', 'direction'),
  C.getReminderStats
);

export default router;
