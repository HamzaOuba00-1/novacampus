/**
 * seed/notification.seed.ts
 * ---------------------------------------------------------------
 * Peuplement initial de la base notifications.
 *
 * Crée : 6 notifications de types variés + préférences.
 * Idempotent. Désactivé en prod.
 *
 * Utilisation :
 *   docker exec -it novacampus-notification-service npm run seed
 * ---------------------------------------------------------------
 */

// database.config doit être importé EN PREMIER pour que dotenv
// charge les variables d'environnement avant tout autre module
import sequelize from '../config/database.config';
import Notification from '../models/notification.model';
import NotificationPreference from '../models/notificationPreference.model';

// Protection contre une exécution accidentelle en production
if (process.env.NODE_ENV === 'prod') {
  console.log('[Seed] NODE_ENV=prod – seed désactivée en production.');
  process.exit(0);
}

// ---------------------------------------------------------------
// UUIDs fictifs cohérents avec les autres microservices
// ---------------------------------------------------------------
const STUDENT_1_ID  = '33333333-3333-3333-3333-333333333333';
const STUDENT_2_ID  = '44444444-4444-4444-4444-444444444444';
const INSTRUCTOR_ID = '22222222-2222-2222-2222-222222222222';

async function runSeed(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Seed] Connexion DB établie.');

    // Synchronisation des modèles (création/modification des tables si nécessaire)
    // alter:true met à jour les colonnes sans supprimer les données existantes
    await sequelize.sync({ alter: true });
    console.log('[Seed] Modèles synchronisés.');

    // ── Notifications étudiant 1 ──────────────────────────────
    const existing = await Notification.count({ where: { userId: STUDENT_1_ID } });
    if (existing === 0) {
      await Notification.create({
        userId: STUDENT_1_ID,
        type: 'schedule_change',
        title: 'Changement de salle – COM101',
        body: 'Le cours COM101 du lundi 22 janvier est déplacé en Amphithéâtre A.',
        channel: 'websocket',
        refType: 'Schedule',
        refId: '66666666-6666-6666-6666-666666666666',
        isRead: true,
        readAt: new Date('2024-01-21T09:30:00'),
        sentAt: new Date('2024-01-20T18:00:00'),
      });
      await Notification.create({
        userId: STUDENT_1_ID,
        type: 'grade_added',
        title: 'Nouvelle note disponible',
        body: 'Votre note pour "Partiel 1 – COM101" est disponible : 14.5/20.',
        channel: 'websocket',
        refType: 'Enrollment',
        refId: '55555555-aaaa-bbbb-cccc-555555555555',
        isRead: false,
        sentAt: new Date('2024-01-25T10:00:00'),
      });
      await Notification.create({
        userId: STUDENT_1_ID,
        type: 'deadline_created',
        title: 'Nouveau rendu – INFO101',
        body: 'Un rendu "Projet Python final" a été ajouté. Date limite : 05 février 2024.',
        channel: 'push',
        refType: 'Deadline',
        isRead: false,
        sentAt: new Date('2024-01-26T08:00:00'),
      });
      console.log('[Seed] 3 notifications créées pour étudiant 1');
    }

    // ── Notifications étudiant 2 ──────────────────────────────
    const existing2 = await Notification.count({ where: { userId: STUDENT_2_ID } });
    if (existing2 === 0) {
      await Notification.create({
        userId: STUDENT_2_ID,
        type: 'payment_overdue',
        title: 'Facture en retard',
        body: 'Votre facture de 4500.00 € (semestre 1 – 2023) est en retard depuis 25 jours.',
        channel: 'email',
        refType: 'Invoice',
        isRead: false,
        sentAt: new Date('2024-01-25T09:00:00'),
      });
      await Notification.create({
        userId: STUDENT_2_ID,
        type: 'document_verified',
        title: 'Document en attente de vérification',
        // Apostrophe échappée pour éviter les erreurs de parsing
        body: "Votre carte nationale d'identité est en cours de vérification par l'administration.",
        channel: 'websocket',
        isRead: true,
        readAt: new Date('2024-01-20T11:00:00'),
        sentAt: new Date('2024-01-19T16:00:00'),
      });
      console.log('[Seed] 2 notifications créées pour étudiant 2');
    }

    // ── Notification enseignant ───────────────────────────────
    const existingInstr = await Notification.count({ where: { userId: INSTRUCTOR_ID } });
    if (existingInstr === 0) {
      await Notification.create({
        userId: INSTRUCTOR_ID,
        type: 'ai_alert',
        title: 'Alerte IA – Étudiants à risque',
        // Apostrophe échappée pour éviter les erreurs de parsing
        body: "2 étudiants de COM101 présentent un taux d'assiduité critique (<50%). Intervention recommandée.",
        channel: 'push',
        refType: 'AiAlert',
        isRead: false,
        sentAt: new Date('2024-01-26T07:00:00'),
      });
      console.log('[Seed] 1 notification créée pour enseignant');
    }

    // ── Préférences de notification étudiant 1 ────────────────
    // Définit quels canaux sont activés pour chaque type de notification
    const prefExists = await NotificationPreference.count({ where: { userId: STUDENT_1_ID } });
    if (prefExists === 0) {
      const prefs = [
        { notifType: 'schedule_change',  pushEnabled: true,  emailEnabled: true,  websocketEnabled: true,  smsEnabled: false },
        { notifType: 'grade_added',      pushEnabled: true,  emailEnabled: false, websocketEnabled: true,  smsEnabled: false },
        { notifType: 'payment_reminder', pushEnabled: true,  emailEnabled: true,  websocketEnabled: true,  smsEnabled: true  },
        { notifType: 'deadline_created', pushEnabled: true,  emailEnabled: true,  websocketEnabled: true,  smsEnabled: false },
      ];
      for (const pref of prefs) {
        await NotificationPreference.create({ userId: STUDENT_1_ID, ...pref as any });
      }
      console.log('[Seed] Préférences créées pour étudiant 1');
    }

    console.log('\n[Seed] Terminée avec succès.');
    console.log('\n[Seed] Pour tester le WebSocket :');
    console.log('  1. Se connecter via POST /api/auth/login → récupérer accessToken');
    console.log('  2. Ouvrir : ws://localhost:3006/api/ws?token=<accessToken>');
    console.log('  3. POST /api/notifications/send → la notif arrive en temps réel');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Erreur :', err);
    process.exit(1);
  }
}

runSeed();