/**
 * seed/inscription.seed.ts  [INSCRIPTION-SERVICE]
 * ---------------------------------------------------------------
 * CORRECTION : département Mercier corrigé
 *   AVANT : 'Informatique' + 'Intelligence Artificielle & ML'
 *   APRÈS : 'Business & Commerce' + 'Commerce International & Marketing'
 *   → Cohérent avec ses cours COM101, MKT201, DATA301
 *
 * UUIDs FIXES – tous cohérents avec user.seed.ts :
 *   INSTRUCTOR_USER_ID : 22222222-2222-2222-2222-222222222222
 *   STUDENT_1_USER_ID  : 33333333-3333-3333-3333-333333333333
 *   STUDENT_2_USER_ID  : 44444444-4444-4444-4444-444444444444
 *
 * PROGRAMME_IDs : les vrais IDs des programmes créés dans academic.seed
 * sont inconnus ici (générés dynamiquement). On utilise les IDs des
 * programmes des étudiants à titre indicatif – mis à jour si besoin.
 * ---------------------------------------------------------------
 */

import sequelize from '../config/database.config';
import Student from '../models/student.model';
import Instructor from '../models/instructor.model';
import StudentDocument from '../models/studentDocument.model';

if (process.env.NODE_ENV === 'prod') {
  console.log('[Seed] NODE_ENV=prod – seed désactivée en production.');
  process.exit(0);
}

const CAMPUS_PARIS_ID    = '11111111-1111-1111-1111-111111111111';
const INSTRUCTOR_USER_ID = '22222222-2222-2222-2222-222222222222'; // Mercier
const STUDENT_1_USER_ID  = '33333333-3333-3333-3333-333333333333'; // Dupont
const STUDENT_2_USER_ID  = '44444444-4444-4444-4444-444444444444'; // Benali
const ADMIN_USER_ID      = '88888888-8888-8888-8888-888888888888';

// IDs de programmes (depuis academic.seed – générés dynamiquement, on met un UUID de remplacement si inconnus)
// En pratique le profil étudiant n'a pas besoin du bon programId pour tester la page planning
const PROGRAM_COMMERCE_PLACEHOLDER = '00000000-0000-0000-0000-000000000000'; // sera mis à jour après academic.seed
const PROGRAM_INFO_PLACEHOLDER     = '00000000-0000-0000-0000-000000000000';

async function runSeed(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Seed] Connexion DB établie.');
    await sequelize.sync({ alter: true });
    console.log('[Seed] Modèles synchronisés.');

    // ── Profil enseignant – Jean-Baptiste Mercier ─────────────
    let instructor = await Instructor.findOne({ where: { userId: INSTRUCTOR_USER_ID } });
    if (!instructor) {
      instructor = await Instructor.create({
        userId: INSTRUCTOR_USER_ID,
        campusId: CAMPUS_PARIS_ID,
        // CORRECTION : département cohérent avec les cours enseignés
        department: 'Business & Commerce',
        specialization: 'Commerce International & Marketing Digital',
        contractType: 'permanent',
        grade: 'Professeur des écoles supérieures',
        phone: '+33 6 12 34 56 78',
        hireDate: new Date('2019-09-01'),
        status: 'active',
      });
      console.log(`[Seed] ✅ Enseignant créé : Jean-Baptiste Mercier (${instructor.id})`);
    } else {
      // Corriger le département si déjà créé avec "Informatique"
      if (instructor.department === 'Informatique') {
        await instructor.update({
          department: 'Business & Commerce',
          specialization: 'Commerce International & Marketing Digital',
        });
        console.log('[Seed] ✅ Département Mercier corrigé : Informatique → Business & Commerce');
      } else {
        console.log('[Seed] Enseignant existant (OK) — ignoré');
      }
    }

    // ── Dossier étudiant 1 – Camille Dupont ──────────────────
    let student1 = await Student.findOne({ where: { userId: STUDENT_1_USER_ID } });
    if (!student1) {
      student1 = await Student.create({
        userId: STUDENT_1_USER_ID,
        programId: PROGRAM_COMMERCE_PLACEHOLDER,
        campusId: CAMPUS_PARIS_ID,
        studentNumber: 'STU-2023-0001',
        firstName: 'Camille',
        lastName: 'Dupont',
        birthDate: new Date('2001-03-15'),
        phone: '+33 7 98 76 54 32',
        address: '12 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        enrollmentYear: 2023,
        status: 'active',
        paymentStatus: 'up_to_date',
        emergencyContactName: 'Marie Dupont',
        emergencyContactPhone: '+33 6 11 22 33 44',
      });
      console.log(`[Seed] ✅ Étudiant créé : ${student1.studentNumber} – Camille Dupont`);
    } else {
      console.log('[Seed] Étudiant 1 existant — ignoré');
    }

    // ── Dossier étudiant 2 – Ahmed Benali ────────────────────
    let student2 = await Student.findOne({ where: { userId: STUDENT_2_USER_ID } });
    if (!student2) {
      student2 = await Student.create({
        userId: STUDENT_2_USER_ID,
        programId: PROGRAM_INFO_PLACEHOLDER,
        campusId: CAMPUS_PARIS_ID,
        studentNumber: 'STU-2023-0002',
        firstName: 'Ahmed',
        lastName: 'Benali',
        birthDate: new Date('2000-11-28'),
        phone: '+33 6 55 44 33 22',
        address: '8 Avenue des Gobelins',
        city: 'Paris',
        postalCode: '75013',
        enrollmentYear: 2023,
        status: 'active',
        paymentStatus: 'overdue',
        emergencyContactName: 'Fatima Benali',
        emergencyContactPhone: '+33 6 99 88 77 66',
      });
      console.log(`[Seed] ✅ Étudiant créé : ${student2.studentNumber} – Ahmed Benali`);
    } else {
      console.log('[Seed] Étudiant 2 existant — ignoré');
    }

    // ── Documents Dupont ──────────────────────────────────────
    const docExists = await StudentDocument.findOne({ where: { studentId: student1.id } });
    if (!docExists) {
      await StudentDocument.create({
        studentId: student1.id, uploadedBy: STUDENT_1_USER_ID,
        type: 'id_card', label: "Carte Nationale d'Identité",
        storageUrl: './uploads/seed-cni-dupont.pdf', fileSizeKb: 245,
        verificationStatus: 'verified', verifiedBy: ADMIN_USER_ID,
        verifiedAt: new Date('2023-09-05'),
      });
      await StudentDocument.create({
        studentId: student1.id, uploadedBy: STUDENT_1_USER_ID,
        type: 'diploma', label: 'Baccalauréat 2022 – Série Générale',
        storageUrl: './uploads/seed-bac-dupont.pdf', fileSizeKb: 512,
        verificationStatus: 'verified', verifiedBy: ADMIN_USER_ID,
        verifiedAt: new Date('2023-09-05'),
      });
      console.log('[Seed] Documents créés pour Dupont');
    }

    const doc2Exists = await StudentDocument.findOne({ where: { studentId: student2.id } });
    if (!doc2Exists) {
      await StudentDocument.create({
        studentId: student2.id, uploadedBy: STUDENT_2_USER_ID,
        type: 'id_card', label: "Carte Nationale d'Identité",
        storageUrl: './uploads/seed-cni-benali.pdf', fileSizeKb: 189,
        verificationStatus: 'pending',
      });
      console.log('[Seed] Document créé pour Benali (en attente)');
    }

    console.log('\n✅ [Seed] Terminée avec succès.');
    console.log(`\n  Mercier    : ${instructor.id} (userId: ${INSTRUCTOR_USER_ID})`);
    console.log(`  Dupont     : ${student1.id}`);
    console.log(`  Benali     : ${student2.id}`);

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Erreur :', err);
    process.exit(1);
  }
}

runSeed();
