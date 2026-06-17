/**
 * seed/campus.seed.ts
 * ---------------------------------------------------------------
 * Peuplement initial de la base campus/admin.
 *
 * Crée :
 *   – 4 campus (Paris, Lyon, Bordeaux, Lille)
 *   – 3 années académiques (2022, 2023, 2024 courante)
 *   – Configuration globale par défaut du système
 *   – 3 entrées d'audit de démonstration
 *
 * LES UUIDs des campus créés ici doivent correspondre
 * aux campusId utilisés dans les autres services.
 * Idempotent. Désactivé en prod.
 *
 * Utilisation :
 *   docker exec -it novacampus-campus-service npm run seed
 * ---------------------------------------------------------------
 */

// database.config doit être importé EN PREMIER pour que dotenv
// charge les variables d'environnement avant tout autre module
import sequelize from '../config/database.config';
import Campus from '../models/campus.model';
import AcademicYear from '../models/academicYear.model';
import GlobalConfig from '../models/globalConfig.model';
import AuditLog from '../models/auditLog.model';

// Protection contre une exécution accidentelle en production
if (process.env.NODE_ENV === 'prod') {
  console.log('[Seed] NODE_ENV=prod – seed désactivée en production.');
  process.exit(0);
}

// ---------------------------------------------------------------
// UUIDs fixes pour la cohérence inter-services
// Ces mêmes UUIDs sont utilisés dans les seeds des autres services
// ---------------------------------------------------------------
const CAMPUS_PARIS_ID    = '11111111-1111-1111-1111-111111111111';
const CAMPUS_LYON_ID     = '55555555-5555-5555-5555-555555555555';
const CAMPUS_BORDEAUX_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const CAMPUS_LILLE_ID    = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const DIRECTION_USER_ID  = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const ADMIN_USER_ID      = '88888888-8888-8888-8888-888888888888';

async function runSeed(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Seed] Connexion DB établie.');

    // Synchronisation des modèles (création/modification des tables si nécessaire)
    // alter:true met à jour les colonnes sans supprimer les données existantes
    await sequelize.sync({ alter: true });
    console.log('[Seed] Modèles synchronisés.');

    // ── Campus ───────────────────────────────────────────────
    const campusData = [
      {
        id: CAMPUS_PARIS_ID,
        code: 'CAMP001',
        name: 'Novacampus Paris',
        city: 'Paris',
        region: 'Île-de-France',
        address: '15 Avenue des Champs-Élysées',
        postalCode: '75008',
        phone: '+33 1 42 00 00 01',
        email: 'paris@novacampus.fr',
        directorUserId: DIRECTION_USER_ID,
        capacityStudents: 1200,
        openingDate: new Date('2018-09-01'),
        status: 'active' as const,
      },
      {
        id: CAMPUS_LYON_ID,
        code: 'CAMP002',
        name: 'Novacampus Lyon',
        city: 'Lyon',
        region: 'Auvergne-Rhône-Alpes',
        address: '8 Place Bellecour',
        postalCode: '69002',
        phone: '+33 4 72 00 00 02',
        email: 'lyon@novacampus.fr',
        directorUserId: null,
        capacityStudents: 800,
        openingDate: new Date('2020-09-01'),
        status: 'active' as const,
      },
      {
        id: CAMPUS_BORDEAUX_ID,
        code: 'CAMP003',
        name: 'Novacampus Bordeaux',
        city: 'Bordeaux',
        region: 'Nouvelle-Aquitaine',
        address: '3 Place de la Bourse',
        postalCode: '33000',
        phone: '+33 5 56 00 00 03',
        email: 'bordeaux@novacampus.fr',
        directorUserId: null,
        capacityStudents: 600,
        openingDate: new Date('2021-09-01'),
        status: 'active' as const,
      },
      {
        id: CAMPUS_LILLE_ID,
        code: 'CAMP004',
        name: 'Novacampus Lille',
        city: 'Lille',
        region: 'Hauts-de-France',
        address: '1 Grand Place',
        postalCode: '59000',
        phone: '+33 3 20 00 00 04',
        email: 'lille@novacampus.fr',
        directorUserId: null,
        capacityStudents: 500,
        openingDate: new Date('2022-09-01'),
        status: 'active' as const,
      },
    ];

    for (const cd of campusData) {
      const exists = await Campus.findByPk(cd.id);
      if (!exists) {
        await Campus.create(cd);
        console.log(`[Seed] Campus créé : ${cd.code} – ${cd.name}`);
      }
    }

    // ── Années académiques ────────────────────────────────────
    const academicYears = [
      {
        year: 2022,
        label: '2022-2023',
        s1Start: new Date('2022-09-05'),
        s1End: new Date('2023-01-20'),
        s2Start: new Date('2023-01-30'),
        s2End: new Date('2023-06-30'),
        isCurrent: false,
      },
      {
        year: 2023,
        label: '2023-2024',
        s1Start: new Date('2023-09-04'),
        s1End: new Date('2024-01-19'),
        s2Start: new Date('2024-01-29'),
        s2End: new Date('2024-06-28'),
        isCurrent: false,
      },
      {
        year: 2024,
        label: '2024-2025',
        s1Start: new Date('2024-09-02'),
        s1End: new Date('2025-01-17'),
        s2Start: new Date('2025-01-27'),
        s2End: new Date('2025-06-27'),
        // Année académique courante – utilisée par défaut dans tous les services
        isCurrent: true,
      },
    ];

    for (const ay of academicYears) {
      const exists = await AcademicYear.findByPk(ay.year);
      if (!exists) {
        await AcademicYear.create(ay);
        console.log(`[Seed] Année créée : ${ay.label} (courant: ${ay.isCurrent})`);
      }
    }

    // ── Configuration globale par défaut ──────────────────────
    // Ces valeurs sont lues par les autres services via l'API campus
    const configs = [
      { key: 'attendance.min_rate',           value: '0.75',  description: "Taux d'assiduité minimum requis (75%)" },
      { key: 'attendance.risk_threshold',     value: '0.50',  description: "Seuil de risque d'exclusion (50%)" },
      { key: 'payment.reminder.level1_days',  value: '7',     description: 'Jours avant relance niveau 1' },
      { key: 'payment.reminder.level2_days',  value: '15',    description: 'Jours avant relance niveau 2' },
      { key: 'payment.reminder.level3_days',  value: '30',    description: 'Jours avant mise en demeure' },
      { key: 'academic.passing_grade',        value: '10.0',  description: 'Note de passage (sur 20)' },
      { key: 'ai.dropout_risk_threshold',     value: '0.65',  description: 'Seuil de risque de décrochage IA' },
      { key: 'ai.payment_risk_threshold',     value: '0.70',  description: 'Seuil de risque de défaut paiement IA' },
      { key: 'notification.batch_size',       value: '10',    description: 'Taille des lots de notifications groupées' },
    ];

    for (const cfg of configs) {
      const exists = await GlobalConfig.findOne({ where: { key: cfg.key, campusId: null } });
      if (!exists) {
        await GlobalConfig.create({ ...cfg, campusId: null, updatedBy: ADMIN_USER_ID });
        console.log(`[Seed] Config créée : ${cfg.key} = ${cfg.value}`);
      }
    }

    // ── Audit log de démonstration ────────────────────────────
    // Exemples d'actions tracées pour illustrer le système d'audit
    // Note : entityId est STRING(100) pour supporter UUID, entier ou clé texte
    const auditCount = await AuditLog.count();
    if (auditCount === 0) {
      await AuditLog.bulkCreate([
        {
          actorId: DIRECTION_USER_ID,
          action: 'campus.create',
          entityType: 'Campus',
          // entityId est un UUID valide pour les entités Campus
          entityId: CAMPUS_PARIS_ID,
          beforeState: null,
          afterState: { code: 'CAMP001', name: 'Novacampus Paris' },
          ipAddress: '192.168.1.1',
          campusId: CAMPUS_PARIS_ID,
        },
        {
          actorId: DIRECTION_USER_ID,
          action: 'academic_year.set_current',
          entityType: 'AcademicYear',
          // entityId est l'année en string car AcademicYear a une PK entière
          entityId: '2024',
          beforeState: { year: 2023, isCurrent: true },
          afterState: { year: 2024, isCurrent: true },
          ipAddress: '192.168.1.1',
          campusId: null,
        },
        {
          actorId: ADMIN_USER_ID,
          action: 'config.update',
          entityType: 'GlobalConfig',
          // entityId est la clé de config en string
          entityId: 'attendance.min_rate',
          beforeState: { value: '0.70' },
          afterState: { value: '0.75' },
          ipAddress: '192.168.1.2',
          campusId: null,
        },
      ]);
      console.log("[Seed] 3 entrées d'audit créées");
    }

    console.log('\n[Seed] Terminée avec succès.');
    console.log('\n[Seed] IDs de référence pour les tests Postman :');
    console.log(`  Campus Paris    : ${CAMPUS_PARIS_ID}`);
    console.log(`  Campus Lyon     : ${CAMPUS_LYON_ID}`);
    console.log(`  Campus Bordeaux : ${CAMPUS_BORDEAUX_ID}`);
    console.log(`  Campus Lille    : ${CAMPUS_LILLE_ID}`);
    console.log('  Année courante  : 2024 (2024-2025)');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Erreur :', err);
    process.exit(1);
  }
}

runSeed();