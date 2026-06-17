/**
 * seed/reporting.seed.ts
 * ---------------------------------------------------------------
 * Peuplement initial de la base reporting/IA.
 *
 * Crée :
 *   – 4 snapshots KPI (un par campus)
 *   – 5 alertes IA de types variés (ouvertes, traitées)
 *   – 2 jobs d'export (pending et ready)
 *
 * Idempotent. Désactivé en prod.
 *
 * Utilisation :
 *   docker exec -it novacampus-reporting-service npm run seed
 * ---------------------------------------------------------------
 */

// database.config doit être importé EN PREMIER pour que dotenv
// charge les variables d'environnement avant tout autre module
import sequelize from '../config/database.config';
import KpiSnapshotModel from '../models/kpiSnapshot.model';
import AiAlert from '../models/aiAlert.model';
import ExportJob from '../models/exportJob.model';

// Protection contre une exécution accidentelle en production
if (process.env.NODE_ENV === 'prod') {
  console.log('[Seed] NODE_ENV=prod – seed désactivée en production.');
  process.exit(0);
}

// ---------------------------------------------------------------
// UUIDs fictifs cohérents avec les autres microservices
// Ces mêmes UUIDs sont utilisés dans les seeds des autres services
// ---------------------------------------------------------------
const CAMPUS_PARIS_ID    = '11111111-1111-1111-1111-111111111111';
const CAMPUS_LYON_ID     = '55555555-5555-5555-5555-555555555555';
const CAMPUS_BORDEAUX_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAMPUS_LILLE_ID    = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const STUDENT_1_ID       = '33333333-3333-3333-3333-333333333333';
const STUDENT_2_ID       = '44444444-4444-4444-4444-444444444444';
const ADMIN_ID           = '88888888-8888-8888-8888-888888888888';
const DIRECTION_ID       = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

async function runSeed(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Seed] Connexion DB établie.');

    // Synchronisation des modèles (création/modification des tables si nécessaire)
    // alter:true met à jour les colonnes sans supprimer les données existantes
    await sequelize.sync({ alter: true });
    console.log('[Seed] Modèles synchronisés.');

    // ── Snapshots KPI ──────────────────────────────────────────
    // Un snapshot par campus pour l'année académique courante
    // Ces valeurs sont recalculées périodiquement par le reporting-service
    const kpiCount = await KpiSnapshotModel.count();
    if (kpiCount === 0) {
      const kpiData = [
        {
          campusId: CAMPUS_PARIS_ID, academicYear: 2024, semester: null,
          totalStudents: 1050, activeStudents: 980, enrollmentRate: 81.7,
          avgAttendanceRate: 83.2, successRate: 84.5, totalRevenue: 4165000.00,
          defaultRate: 12.3, roomOccupancyRate: 68.4, computedAt: new Date(),
        },
        {
          campusId: CAMPUS_LYON_ID, academicYear: 2024, semester: null,
          totalStudents: 640, activeStudents: 595, enrollmentRate: 74.4,
          avgAttendanceRate: 79.1, successRate: 81.2, totalRevenue: 2677500.00,
          defaultRate: 16.8, roomOccupancyRate: 62.1, computedAt: new Date(),
        },
        {
          campusId: CAMPUS_BORDEAUX_ID, academicYear: 2024, semester: null,
          totalStudents: 480, activeStudents: 450, enrollmentRate: 75.0,
          avgAttendanceRate: 77.8, successRate: 78.9, totalRevenue: 2025000.00,
          defaultRate: 19.2, roomOccupancyRate: 58.3, computedAt: new Date(),
        },
        {
          campusId: CAMPUS_LILLE_ID, academicYear: 2024, semester: null,
          totalStudents: 390, activeStudents: 362, enrollmentRate: 72.4,
          avgAttendanceRate: 74.5, successRate: 76.3, totalRevenue: 1629000.00,
          defaultRate: 22.5, roomOccupancyRate: 54.7, computedAt: new Date(),
        },
      ];
      await KpiSnapshotModel.bulkCreate(kpiData as any);
      console.log('[Seed] 4 snapshots KPI créés');
    }

    // ── Alertes IA ─────────────────────────────────────────────
    // Alertes de démonstration couvrant tous les types et statuts
    const alertCount = await AiAlert.count();
    if (alertCount === 0) {
      await AiAlert.create({
        studentId: STUDENT_2_ID,
        campusId: CAMPUS_PARIS_ID,
        type: 'dropout_risk',
        severity: 'high',
        score: 0.782,
        factors: {
          attendanceRate: 42.5,
          gradeAverage: 7.8,
          overdueInvoices: 1,
          unjustifiedAbsences: 8,
        },
        // Apostrophe échappée pour éviter les erreurs de parsing
        recommendation: "Intervention urgente. Taux de présence de 42.5% et moyenne de 7.8/20. Contacter immédiatement l'étudiant et l'enseignant référent.",
        status: 'open',
      });

      await AiAlert.create({
        studentId: STUDENT_1_ID,
        campusId: CAMPUS_PARIS_ID,
        type: 'low_attendance',
        severity: 'medium',
        score: 0.612,
        factors: { attendanceRate: 58.3 },
        recommendation: 'Taux de présence critique : 58.3%. Proposer un entretien pédagogique et vérifier les justificatifs.',
        status: 'open',
      });

      await AiAlert.create({
        studentId: STUDENT_2_ID,
        campusId: CAMPUS_PARIS_ID,
        type: 'payment_risk',
        severity: 'critical',
        score: 0.912,
        factors: {
          overdueCount: 1,
          totalCount: 2,
          overdueAmount: 4500,
          totalAmount: 9000,
        },
        recommendation: "1 facture en retard pour 4500€. Déclencher relance personnalisée et proposer un échéancier.",
        status: 'actioned',
        actionedBy: ADMIN_ID,
        actionNote: 'Étudiant contacté. Échéancier de 3 mensualités mis en place.',
      });

      await AiAlert.create({
        studentId: null,
        campusId: CAMPUS_BORDEAUX_ID,
        type: 'campus_anomaly',
        severity: 'medium',
        score: 0.554,
        factors: {
          successRateDrop: 5.2,
          previousSuccessRate: 84.1,
          currentSuccessRate: 78.9,
        },
        recommendation: 'Baisse de 5.2 points du taux de réussite sur le campus de Bordeaux. Analyse approfondie recommandée.',
        status: 'open',
      });

      await AiAlert.create({
        studentId: null,
        campusId: CAMPUS_LILLE_ID,
        type: 'room_underuse',
        severity: 'low',
        score: 0.342,
        factors: {
          occupancyRate: 54.7,
          threshold: 60.0,
          unusedRoomsCount: 4,
        },
        recommendation: '4 salles sous-utilisées identifiées. Revoir l\'attribution des créneaux pour optimiser les ressources.',
        status: 'dismissed',
        actionedBy: ADMIN_ID,
        actionNote: 'Hors saison, normal sur ce campus. Réévaluer en octobre.',
      });

      console.log('[Seed] 5 alertes IA créées');
    }

    // ── Jobs d'export ──────────────────────────────────────────
    // Exemples de jobs dans différents états pour illustrer le workflow
    const exportCount = await ExportJob.count();
    if (exportCount === 0) {
      await ExportJob.create({
        requestedBy: DIRECTION_ID,
        reportType: 'kpis',
        format: 'csv',
        filters: { academicYear: 2024 },
        status: 'ready',
        // Fichier de démonstration pré-généré lors du seed
        filePath: './exports/kpis-demo.csv',
        rowCount: 4,
      });

      await ExportJob.create({
        requestedBy: ADMIN_ID,
        reportType: 'students',
        format: 'json',
        filters: { campusId: CAMPUS_PARIS_ID, status: 'active' },
        // Job en attente de traitement par le worker de reporting
        status: 'pending',
        filePath: null,
        rowCount: null,
      });

      console.log("[Seed] 2 jobs d'export créés");
    }

    console.log('\n[Seed] Terminée avec succès.');
    console.log('\n[Seed] KPIs disponibles pour les 4 campus :');
    console.log('  Paris    : succès 84.5%, présence 83.2%, revenus 4 165 000€');
    console.log('  Lyon     : succès 81.2%, présence 79.1%, revenus 2 677 500€');
    console.log('  Bordeaux : succès 78.9%, présence 77.8%, revenus 2 025 000€');
    console.log('  Lille    : succès 76.3%, présence 74.5%, revenus 1 629 000€');
    console.log('\n[Seed] 5 alertes IA : 2 ouvertes, 1 traitée, 1 ignorée, 1 critique');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Erreur :', err);
    process.exit(1);
  }
}

runSeed();