/**
 * seed/payment.seed.ts
 * ---------------------------------------------------------------
 * Peuplement initial de la base paiements.
 *
 * Crée : 4 factures (payée, en attente, en retard, annulée)
 *        + 3 relances sur la facture en retard.
 * Idempotent. Désactivé en prod.
 *
 * Utilisation :
 *   docker exec -it novacampus-payment-service npm run seed
 * ---------------------------------------------------------------
 */

// database.config doit être importé EN PREMIER pour que dotenv
// charge les variables d'environnement avant tout autre module
import sequelize from '../config/database.config';
import Invoice from '../models/invoice.model';
import PaymentReminder from '../models/paymentReminder.model';

// Protection contre une exécution accidentelle en production
if (process.env.NODE_ENV === 'prod') {
  console.log('[Seed] NODE_ENV=prod – seed désactivée en production.');
  process.exit(0);
}

// ---------------------------------------------------------------
// UUIDs fictifs cohérents avec les autres microservices
// ---------------------------------------------------------------
const CAMPUS_PARIS_ID = '11111111-1111-1111-1111-111111111111';
const CAMPUS_LYON_ID  = '55555555-5555-5555-5555-555555555555';
const STUDENT_1_ID    = '33333333-3333-3333-3333-333333333333';
const STUDENT_2_ID    = '44444444-4444-4444-4444-444444444444';
const PROGRAM_1_ID    = '66666666-6666-6666-6666-666666666666';
const PROGRAM_2_ID    = '77777777-7777-7777-7777-777777777777';
const ADMIN_ID        = '88888888-8888-8888-8888-888888888888';

async function runSeed(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Seed] Connexion DB établie.');

    // Synchronisation des modèles (création/modification des tables si nécessaire)
    // alter:true met à jour les colonnes sans supprimer les données existantes
    await sequelize.sync({ alter: true });
    console.log('[Seed] Modèles synchronisés.');

    // ── Facture 1 : payée ─────────────────────────────────────
    let inv1 = await Invoice.findOne({
      where: { studentId: STUDENT_1_ID, academicYear: 2023, semester: 1 },
    });
    if (!inv1) {
      inv1 = await Invoice.create({
        studentId: STUDENT_1_ID,
        programId: PROGRAM_1_ID,
        campusId: CAMPUS_PARIS_ID,
        academicYear: 2023,
        semester: 1,
        amount: 4250.00,
        status: 'paid',
        invoiceDate: new Date('2023-09-01'),
        dueDate: new Date('2023-10-01'),
        paidAt: new Date('2023-09-28'),
        paymentMethod: 'transfer',
        reference: 'VIR-20230928-001',
      });
      console.log(`[Seed] Facture créée (payée) : ${inv1.id}`);
    }

    // ── Facture 2 : en attente ────────────────────────────────
    let inv2 = await Invoice.findOne({
      where: { studentId: STUDENT_1_ID, academicYear: 2023, semester: 2 },
    });
    if (!inv2) {
      inv2 = await Invoice.create({
        studentId: STUDENT_1_ID,
        programId: PROGRAM_1_ID,
        campusId: CAMPUS_PARIS_ID,
        academicYear: 2023,
        semester: 2,
        amount: 4250.00,
        status: 'pending',
        invoiceDate: new Date('2024-02-01'),
        dueDate: new Date('2024-03-01'),
      });
      console.log(`[Seed] Facture créée (pending) : ${inv2.id}`);
    }

    // ── Facture 3 : en retard (avec relances) ─────────────────
    let inv3 = await Invoice.findOne({
      where: { studentId: STUDENT_2_ID, academicYear: 2023, semester: 1 },
    });
    if (!inv3) {
      inv3 = await Invoice.create({
        studentId: STUDENT_2_ID,
        programId: PROGRAM_2_ID,
        campusId: CAMPUS_PARIS_ID,
        academicYear: 2023,
        semester: 1,
        amount: 4500.00,
        status: 'overdue',
        invoiceDate: new Date('2023-09-01'),
        dueDate: new Date('2023-10-01'),
      });
      console.log(`[Seed] Facture créée (overdue) : ${inv3.id}`);
    }

    // ── Relances sur la facture en retard ─────────────────────
    const remindersCount = await PaymentReminder.count({ where: { invoiceId: inv3.id } });
    if (remindersCount === 0) {
      await PaymentReminder.create({
        invoiceId: inv3.id,
        level: 1,
        channel: 'email',
        triggeredBy: 'scheduled',
        contentSnapshot: 'Rappel : votre facture de 4500.00 € était due le 01/10/2023. Merci de procéder au règlement.',
        sentAt: new Date('2023-10-08'),
      });
      await PaymentReminder.create({
        invoiceId: inv3.id,
        level: 2,
        channel: 'email',
        triggeredBy: 'ai_agent',
        contentSnapshot: 'RELANCE : malgré notre précédent rappel, votre facture de 4500.00 € reste impayée. Veuillez régulariser votre situation sous 8 jours.',
        sentAt: new Date('2023-10-16'),
      });
      await PaymentReminder.create({
        invoiceId: inv3.id,
        level: 2,
        channel: 'sms',
        triggeredBy: 'manual',
        // Apostrophe échappée pour éviter les erreurs de parsing
        contentSnapshot: "NOVACAMPUS : Votre facture de 4500€ est impayée. Contactez l'administration.",
        sentAt: new Date('2023-10-20'),
      });
      console.log('[Seed] 3 relances créées pour la facture en retard');
    }

    // ── Facture 4 : annulée ───────────────────────────────────
    let inv4 = await Invoice.findOne({
      where: { studentId: STUDENT_2_ID, academicYear: 2023, semester: 2 },
    });
    if (!inv4) {
      inv4 = await Invoice.create({
        studentId: STUDENT_2_ID,
        programId: PROGRAM_2_ID,
        campusId: CAMPUS_LYON_ID,
        academicYear: 2023,
        semester: 2,
        amount: 4500.00,
        status: 'cancelled',
        invoiceDate: new Date('2024-02-01'),
        dueDate: new Date('2024-03-01'),
      });
      console.log(`[Seed] Facture créée (cancelled) : ${inv4.id}`);
    }

    console.log('\n[Seed] Terminée avec succès.');
    console.log('\n[Seed] IDs de référence pour les tests Postman :');
    console.log(`  Facture payée    : ${inv1.id}`);
    console.log(`  Facture pending  : ${inv2.id}`);
    console.log(`  Facture overdue  : ${inv3.id}`);
    console.log(`  Facture annulée  : ${inv4.id}`);

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Erreur :', err);
    process.exit(1);
  }
}

runSeed();