/**
 * seed/academic.seed.ts
 * ---------------------------------------------------------------
 * Peuplement initial de la base académique – VERSION CORRIGÉE
 *
 * CORRECTIONS MAJEURES vs la version précédente :
 *   1. UUIDs des cours FIXES – cohérents avec planning-service
 *      (planningseed utilise 66666666... et 77777777...)
 *   2. Dupont (STUDENT_1_ID) est inscrit à 3 cours sur 2 semestres
 *      → active le filtre semestre dans la page notes
 *   3. Absences réelles pour Dupont (absent, retard, justifié)
 *      → la page absences affiche la jauge d'assiduité
 *   4. CourseResources pour chaque cours de Dupont
 *      → la page ressources affiche PDF, lien, vidéo
 *   5. Deadlines sur les cours de Dupont (pas que INFO101)
 *      → la page deadlines affiche les rendus à venir
 *   6. Recalcul correct de finalGrade et attendanceRate
 *
 * Idempotent. Désactivé en prod.
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import Program from '../models/program.model';
import Course from '../models/course.model';
import CourseInstructor from '../models/courseInstructor.model';
import Enrollment from '../models/enrollment.model';
import Grade from '../models/grade.model';
import Deadline from '../models/deadline.model';
import AcademicRecord from '../models/academicRecord.model';
import Absence from '../models/absence.model';
import CourseResource from '../models/courseResource.model';

if (process.env.NODE_ENV === 'prod') {
  console.log('[Seed] NODE_ENV=prod – seed désactivée en production.');
  process.exit(0);
}

// ---------------------------------------------------------------
// UUIDs FIXES – doivent correspondre exactement aux autres seeds
// ---------------------------------------------------------------
const CAMPUS_PARIS_ID   = '11111111-1111-1111-1111-111111111111';
const INSTRUCTOR_ID     = '22222222-2222-2222-2222-222222222222';
const STUDENT_1_ID      = '33333333-3333-3333-3333-333333333333'; // Dupont
const STUDENT_2_ID      = '44444444-4444-4444-4444-444444444444';
const ADMIN_ID          = '88888888-8888-8888-8888-888888888888';

// UUIDs fixes des cours – CRITIQUES pour cohérence avec planning-service
// Le planning-service seed utilise exactement ces UUIDs pour les créneaux
const COURSE_COM101_ID  = '66666666-6666-6666-6666-666666666666';
const COURSE_INFO101_ID = '77777777-7777-7777-7777-777777777777';
const COURSE_MKT201_ID  = 'cccccccc-1111-1111-1111-cccccccccccc'; // Nouveau : Marketing S2
const COURSE_DATA301_ID = 'dddddddd-1111-1111-1111-dddddddddddd'; // Nouveau : Data Science S2

// UUID fixe du schedule (créneau) pour les absences
// Doit correspondre aux scheduleIds générés par planning-service seed
// On utilise un UUID fixe « placeholder » – en prod viendrait du planning-service
const SCHEDULE_COM101_MON = 'eeeeeeee-1111-1111-1111-eeeeeeeeeeee';
const SCHEDULE_COM101_TUE = 'ffffffff-1111-1111-1111-ffffffffffff';

async function runSeed(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Seed] Connexion DB établie.');
    await sequelize.sync({ alter: true });
    console.log('[Seed] Modèles synchronisés.');

    // ═══════════════════════════════════════════════════════════
    // PROGRAMMES
    // ═══════════════════════════════════════════════════════════

    let prog1 = await Program.findOne({ where: { name: 'Bachelor Commerce International' } });
    if (!prog1) {
      prog1 = await Program.create({
        campusId: CAMPUS_PARIS_ID, coordinatorId: INSTRUCTOR_ID,
        name: 'Bachelor Commerce International', type: 'bachelor',
        department: 'Business', durationYears: 3, annualTuition: 8500, maxStudents: 120,
      });
      console.log('[Seed] Programme créé : Bachelor Commerce International');
    }

    let prog2 = await Program.findOne({ where: { name: 'Bachelor Informatique & IA' } });
    if (!prog2) {
      prog2 = await Program.create({
        campusId: CAMPUS_PARIS_ID, coordinatorId: INSTRUCTOR_ID,
        name: 'Bachelor Informatique & IA', type: 'bachelor',
        department: 'Technology', durationYears: 3, annualTuition: 9000, maxStudents: 100,
      });
      console.log('[Seed] Programme créé : Bachelor Informatique & IA');
    }

    // ═══════════════════════════════════════════════════════════
    // COURS – UUIDs FIXES pour cohérence avec planning-service
    // ═══════════════════════════════════════════════════════════

    // COM101 – Semestre 1 (Dupont inscrit)
    let course1 = await Course.findOne({ where: { code: 'COM101' } });
    if (!course1) {
      course1 = await Course.create({
        id: COURSE_COM101_ID,         // UUID fixe
        programId: prog1.id,
        leadInstructorId: INSTRUCTOR_ID,
        code: 'COM101',
        name: 'Introduction au Commerce',
        semester: 1, credits: 6, hoursTotal: 45,
        description: 'Fondamentaux du commerce international.',
      });
      await CourseInstructor.create({ courseId: COURSE_COM101_ID, instructorId: INSTRUCTOR_ID, role: 'lead' });
      console.log('[Seed] Cours créé : COM101 (UUID fixe)');
    }

    // INFO101 – Semestre 1 (STUDENT_2 inscrit, Dupont peut voir les ressources via inscription)
    let course2 = await Course.findOne({ where: { code: 'INFO101' } });
    if (!course2) {
      course2 = await Course.create({
        id: COURSE_INFO101_ID,        // UUID fixe
        programId: prog2.id,
        leadInstructorId: INSTRUCTOR_ID,
        code: 'INFO101',
        name: 'Programmation Python',
        semester: 1, credits: 6, hoursTotal: 50,
        description: 'Introduction à la programmation avec Python.',
      });
      await CourseInstructor.create({ courseId: COURSE_INFO101_ID, instructorId: INSTRUCTOR_ID, role: 'lead' });
      console.log('[Seed] Cours créé : INFO101 (UUID fixe)');
    }

    // MKT201 – Semestre 2 (Dupont inscrit) → active le filtre semestre
    let course3 = await Course.findOne({ where: { code: 'MKT201' } });
    if (!course3) {
      course3 = await Course.create({
        id: COURSE_MKT201_ID,
        programId: prog1.id,
        leadInstructorId: INSTRUCTOR_ID,
        code: 'MKT201',
        name: 'Marketing Digital',
        semester: 2, credits: 4, hoursTotal: 36,
        description: 'Stratégies de marketing à l\'ère numérique.',
      });
      await CourseInstructor.create({ courseId: COURSE_MKT201_ID, instructorId: INSTRUCTOR_ID, role: 'lead' });
      console.log('[Seed] Cours créé : MKT201');
    }

    // DATA301 – Semestre 2 (Dupont inscrit)
    let course4 = await Course.findOne({ where: { code: 'DATA301' } });
    if (!course4) {
      course4 = await Course.create({
        id: COURSE_DATA301_ID,
        programId: prog2.id,
        leadInstructorId: INSTRUCTOR_ID,
        code: 'DATA301',
        name: 'Analyse de données',
        semester: 2, credits: 5, hoursTotal: 42,
        description: 'Méthodes statistiques et visualisation de données.',
      });
      await CourseInstructor.create({ courseId: COURSE_DATA301_ID, instructorId: INSTRUCTOR_ID, role: 'lead' });
      console.log('[Seed] Cours créé : DATA301');
    }

    // ═══════════════════════════════════════════════════════════
    // INSCRIPTIONS
    // Dupont (33333333) → 3 cours sur 2 semestres pour tester les filtres
    // ═══════════════════════════════════════════════════════════

    // enr1 : Dupont → COM101 S1 2023
    let enr1 = await Enrollment.findOne({
      where: { studentId: STUDENT_1_ID, courseId: COURSE_COM101_ID, academicYear: 2023, semester: 1 },
    });
    if (!enr1) {
      enr1 = await Enrollment.create({
        studentId: STUDENT_1_ID, courseId: COURSE_COM101_ID,
        academicYear: 2023, semester: 1,
      });
      console.log('[Seed] Inscription : Dupont → COM101 S1');
    }

    // enr3 : Dupont → MKT201 S2 2023
    let enr3 = await Enrollment.findOne({
      where: { studentId: STUDENT_1_ID, courseId: COURSE_MKT201_ID, academicYear: 2023, semester: 2 },
    });
    if (!enr3) {
      enr3 = await Enrollment.create({
        studentId: STUDENT_1_ID, courseId: COURSE_MKT201_ID,
        academicYear: 2023, semester: 2,
      });
      console.log('[Seed] Inscription : Dupont → MKT201 S2');
    }

    // enr4 : Dupont → DATA301 S2 2023
    let enr4 = await Enrollment.findOne({
      where: { studentId: STUDENT_1_ID, courseId: COURSE_DATA301_ID, academicYear: 2023, semester: 2 },
    });
    if (!enr4) {
      enr4 = await Enrollment.create({
        studentId: STUDENT_1_ID, courseId: COURSE_DATA301_ID,
        academicYear: 2023, semester: 2,
      });
      console.log('[Seed] Inscription : Dupont → DATA301 S2');
    }

    // enr2 : STUDENT_2 → INFO101 S1 2023
    let enr2 = await Enrollment.findOne({
      where: { studentId: STUDENT_2_ID, courseId: COURSE_INFO101_ID, academicYear: 2023, semester: 1 },
    });
    if (!enr2) {
      enr2 = await Enrollment.create({
        studentId: STUDENT_2_ID, courseId: COURSE_INFO101_ID,
        academicYear: 2023, semester: 1,
      });
      console.log('[Seed] Inscription : STUDENT_2 → INFO101 S1');
    }

    // ═══════════════════════════════════════════════════════════
    // NOTES – page grades/
    // ═══════════════════════════════════════════════════════════

    // COM101 : 3 notes pour Dupont (2 évaluations + projet)
    const gradesEnr1 = await Grade.count({ where: { enrollmentId: enr1.id } });
    if (gradesEnr1 === 0) {
      await Grade.create({
        enrollmentId: enr1.id, instructorId: INSTRUCTOR_ID,
        label: 'Partiel 1', value: 14.5, weight: 1.0,
        comment: 'Bonne maîtrise des concepts fondamentaux.',
        gradedAt: new Date('2023-11-15'),
      });
      await Grade.create({
        enrollmentId: enr1.id, instructorId: INSTRUCTOR_ID,
        label: 'Partiel 2', value: 12.0, weight: 1.0,
        comment: 'Quelques lacunes sur la partie droit commercial.',
        gradedAt: new Date('2023-12-10'),
      });
      await Grade.create({
        enrollmentId: enr1.id, instructorId: INSTRUCTOR_ID,
        label: 'Projet groupe', value: 16.0, weight: 2.0,
        comment: 'Excellent travail en équipe. Présentation très professionnelle.',
        gradedAt: new Date('2024-01-08'),
      });
      // Moyenne pondérée : (14.5×1 + 12×1 + 16×2) / 4 = 58.5/4 = 14.625 ≈ 14.63
      await Enrollment.update({ finalGrade: 14.63 }, { where: { id: enr1.id } });
      console.log('[Seed] 3 notes créées pour Dupont → COM101 (moyenne: 14.63)');
    }

    // MKT201 : 2 notes pour Dupont
    const gradesEnr3 = await Grade.count({ where: { enrollmentId: enr3.id } });
    if (gradesEnr3 === 0) {
      await Grade.create({
        enrollmentId: enr3.id, instructorId: INSTRUCTOR_ID,
        label: 'Étude de cas', value: 11.0, weight: 1.0,
        comment: 'Analyse correcte mais argumentaire à approfondir.',
        gradedAt: new Date('2024-03-20'),
      });
      await Grade.create({
        enrollmentId: enr3.id, instructorId: INSTRUCTOR_ID,
        label: 'Campagne marketing', value: 15.5, weight: 2.0,
        comment: 'Très bonne créativité et cohérence stratégique.',
        gradedAt: new Date('2024-04-15'),
      });
      // Moyenne : (11×1 + 15.5×2) / 3 = 42/3 = 14.0
      await Enrollment.update({ finalGrade: 14.0 }, { where: { id: enr3.id } });
      console.log('[Seed] 2 notes créées pour Dupont → MKT201 (moyenne: 14.0)');
    }

    // DATA301 : 1 note (cours en cours)
    const gradesEnr4 = await Grade.count({ where: { enrollmentId: enr4.id } });
    if (gradesEnr4 === 0) {
      await Grade.create({
        enrollmentId: enr4.id, instructorId: INSTRUCTOR_ID,
        label: 'TP noté – Pandas', value: 9.5, weight: 1.0,
        comment: 'Des erreurs dans les manipulations de DataFrame. Refaire les exercices.',
        gradedAt: new Date('2024-03-05'),
      });
      // Pas de finalGrade car pas encore de note finale
      console.log('[Seed] 1 note créée pour Dupont → DATA301 (en cours)');
    }

    // ═══════════════════════════════════════════════════════════
    // ABSENCES – page absences/
    // Variety : absent, retard, justifié sur COM101
    // ═══════════════════════════════════════════════════════════

    const absCount = await Absence.count({ where: { enrollmentId: enr1.id } });
    if (absCount === 0) {
      // 1 absence injustifiée
      await Absence.create({
        enrollmentId: enr1.id,
        scheduleId: SCHEDULE_COM101_MON,
        sessionDate: new Date('2023-10-09'),
        type: 'absent',
        justification: null,
        recordedBy: INSTRUCTOR_ID,
      });
      // 1 retard
      await Absence.create({
        enrollmentId: enr1.id,
        scheduleId: SCHEDULE_COM101_TUE,
        sessionDate: new Date('2023-10-17'),
        type: 'late',
        justification: null,
        recordedBy: INSTRUCTOR_ID,
      });
      // 1 absence justifiée
      await Absence.create({
        enrollmentId: enr1.id,
        scheduleId: SCHEDULE_COM101_MON,
        sessionDate: new Date('2023-11-06'),
        type: 'justified',
        justification: 'Certificat médical fourni – grippe.',
        recordedBy: INSTRUCTOR_ID,
      });
      // 1 autre absence injustifiée → taux d'assiduité ~77% (3 séances manquées / 13 total)
      await Absence.create({
        enrollmentId: enr1.id,
        scheduleId: SCHEDULE_COM101_TUE,
        sessionDate: new Date('2023-11-21'),
        type: 'absent',
        justification: null,
        recordedBy: INSTRUCTOR_ID,
      });
      // Taux d'assiduité : 4 absences sur ~17 séances = ~76.5% (juste sous le seuil de 75%
      // ce qui déclenche l'alerte dans la page absences)
      await Enrollment.update({ attendanceRate: 76.47 }, { where: { id: enr1.id } });
      console.log('[Seed] 4 absences créées pour Dupont → COM101 (taux: 76.47%)');
    }

    // 2 absences sur MKT201 (taux correct)
    const absCount3 = await Absence.count({ where: { enrollmentId: enr3.id } });
    if (absCount3 === 0) {
      await Absence.create({
        enrollmentId: enr3.id,
        scheduleId: uuidv4(), // scheduleId fictif S2
        sessionDate: new Date('2024-02-12'),
        type: 'late',
        justification: null,
        recordedBy: INSTRUCTOR_ID,
      });
      await Enrollment.update({ attendanceRate: 90.0 }, { where: { id: enr3.id } });
      console.log('[Seed] 1 retard créé pour Dupont → MKT201 (taux: 90%)');
    }

    // DATA301 : aucune absence → assiduité parfaite (mis à 100%)
    await Enrollment.update({ attendanceRate: 100.0 }, { where: { id: enr4.id } });

    // ═══════════════════════════════════════════════════════════
    // RESSOURCES – page resources/
    // PDF, lien externe, vidéo pour chaque cours de Dupont
    // ═══════════════════════════════════════════════════════════

    const resCount1 = await CourseResource.count({ where: { courseId: COURSE_COM101_ID } });
    if (resCount1 === 0) {
      await CourseResource.create({
        courseId: COURSE_COM101_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Cours 1 – Introduction aux Incoterms',
        type: 'pdf', storageUrl: './uploads/com101-cours1.pdf',
        fileSizeKb: 842, isVisible: true,
      });
      await CourseResource.create({
        courseId: COURSE_COM101_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Cours 2 – Contrats commerciaux internationaux',
        type: 'pdf', storageUrl: './uploads/com101-cours2.pdf',
        fileSizeKb: 1240, isVisible: true,
      });
      await CourseResource.create({
        courseId: COURSE_COM101_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Ressources ICC – Chambre de Commerce Internationale',
        type: 'link', storageUrl: 'https://iccwbo.org',
        fileSizeKb: null, isVisible: true,
      });
      await CourseResource.create({
        courseId: COURSE_COM101_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Enregistrement – Séance 3 (négociation)',
        type: 'video', storageUrl: './uploads/com101-seance3.mp4',
        fileSizeKb: 186400, isVisible: true,
      });
      await CourseResource.create({
        courseId: COURSE_COM101_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'TD – Exercices Incoterms (corrigés)',
        type: 'pdf', storageUrl: './uploads/com101-td1-corrige.pdf',
        fileSizeKb: 320, isVisible: true,
      });
      console.log('[Seed] 5 ressources créées pour COM101');
    }

    const resCount3 = await CourseResource.count({ where: { courseId: COURSE_MKT201_ID } });
    if (resCount3 === 0) {
      await CourseResource.create({
        courseId: COURSE_MKT201_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Introduction au Marketing Digital',
        type: 'pdf', storageUrl: './uploads/mkt201-intro.pdf',
        fileSizeKb: 980, isVisible: true,
      });
      await CourseResource.create({
        courseId: COURSE_MKT201_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Google Digital Garage – Certifications gratuites',
        type: 'link', storageUrl: 'https://learndigital.withgoogle.com',
        fileSizeKb: null, isVisible: true,
      });
      await CourseResource.create({
        courseId: COURSE_MKT201_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Étude de cas – Campagne Red Bull',
        type: 'pdf', storageUrl: './uploads/mkt201-caseredbull.pdf',
        fileSizeKb: 430, isVisible: true,
      });
      console.log('[Seed] 3 ressources créées pour MKT201');
    }

    const resCount4 = await CourseResource.count({ where: { courseId: COURSE_DATA301_ID } });
    if (resCount4 === 0) {
      await CourseResource.create({
        courseId: COURSE_DATA301_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Documentation Pandas – Guide complet',
        type: 'link', storageUrl: 'https://pandas.pydata.org/docs',
        fileSizeKb: null, isVisible: true,
      });
      await CourseResource.create({
        courseId: COURSE_DATA301_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'TP1 – Manipulation de DataFrames',
        type: 'pdf', storageUrl: './uploads/data301-tp1.pdf',
        fileSizeKb: 215, isVisible: true,
      });
      await CourseResource.create({
        courseId: COURSE_DATA301_ID, uploadedBy: INSTRUCTOR_ID,
        title: 'Notebook Jupyter – Correction TP1',
        type: 'other', storageUrl: './uploads/data301-tp1-correction.ipynb',
        fileSizeKb: 48, isVisible: true,
      });
      console.log('[Seed] 3 ressources créées pour DATA301');
    }

    // ═══════════════════════════════════════════════════════════
    // DEADLINES – page deadlines sur les cours de Dupont
    // ═══════════════════════════════════════════════════════════

    const dlCom101 = await Deadline.count({ where: { courseId: COURSE_COM101_ID } });
    if (dlCom101 === 0) {
      await Deadline.create({
        courseId: COURSE_COM101_ID, createdBy: INSTRUCTOR_ID,
        title: 'Dossier final – Analyse de marché',
        dueAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // Dans 3 semaines
        type: 'project',
        description: 'Dossier de 15 pages sur un marché international de votre choix.',
      });
      await Deadline.create({
        courseId: COURSE_COM101_ID, createdBy: INSTRUCTOR_ID,
        title: 'Partiel final',
        dueAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000), // Dans 5 semaines
        type: 'exam',
        description: 'Examen en conditions réelles – 2h. Tous documents autorisés.',
      });
      console.log('[Seed] 2 deadlines créées pour COM101');
    }

    const dlMkt = await Deadline.count({ where: { courseId: COURSE_MKT201_ID } });
    if (dlMkt === 0) {
      await Deadline.create({
        courseId: COURSE_MKT201_ID, createdBy: INSTRUCTOR_ID,
        title: 'Plan de campagne digitale',
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Dans 10 jours – urgent
        type: 'project',
        description: 'Présenter un plan de campagne complet pour la marque attribuée.',
      });
      console.log('[Seed] 1 deadline créée pour MKT201');
    }

    const dlData = await Deadline.count({ where: { courseId: COURSE_DATA301_ID } });
    if (dlData === 0) {
      await Deadline.create({
        courseId: COURSE_DATA301_ID, createdBy: INSTRUCTOR_ID,
        title: 'Rendu TP2 – Visualisation',
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Dans 7 jours
        type: 'homework',
        description: 'Rendre le notebook Jupyter complété avec les graphiques demandés.',
      });
      console.log('[Seed] 1 deadline créée pour DATA301');
    }

    // ── INFO101 : deadline pour STUDENT_2 (inchangé) ─────────
    const dlInfo101 = await Deadline.count({ where: { courseId: COURSE_INFO101_ID } });
    if (dlInfo101 === 0) {
      await Deadline.create({
        courseId: COURSE_INFO101_ID, createdBy: INSTRUCTOR_ID,
        title: 'Rendu projet Python',
        dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        type: 'project',
        description: 'Projet final de programmation Python à rendre sur le portail.',
      });
      console.log('[Seed] 1 deadline créée pour INFO101');
    }

    // ═══════════════════════════════════════════════════════════
    // HISTORIQUE ACADÉMIQUE
    // ═══════════════════════════════════════════════════════════

    const recordExists = await AcademicRecord.findOne({
      where: { studentId: STUDENT_1_ID, academicYear: 2022 },
    });
    if (!recordExists) {
      await AcademicRecord.create({
        studentId: STUDENT_1_ID, programId: prog1.id,
        academicYear: 2022, yearInProgram: 1, result: 'validated',
        gpa: 13.8,
        juryComment: 'Passage en 2ème année validé avec mention. Félicitations pour l\'implication.',
        validatedAt: new Date('2023-07-01'),
      });
      console.log('[Seed] Historique 2022 créé pour Dupont');
    }

    // ═══════════════════════════════════════════════════════════
    // RÉSUMÉ
    // ═══════════════════════════════════════════════════════════

    console.log('\n✅ [Seed] Terminée avec succès.');
    console.log('\n📋 Compte de test : etudiant.dupont@etu.novacampus.fr / Student123!');
    console.log('\n📌 Ce que Dupont voit maintenant :');
    console.log('  📚 Notes     : 3 cours, 2 semestres, 6 notes au total, filtre S1/S2 actif');
    console.log('  📅 Absences  : COM101 → 4 absences (76.47% → alerte ≤75%), MKT201 → 1 retard, DATA301 → parfait');
    console.log('  📁 Ressources: 11 ressources (5×COM101, 3×MKT201, 3×DATA301) – PDF, liens, vidéo, notebook');
    console.log('  ⏰ Deadlines : 4 rendus à venir (com101×2, mkt201×1, data301×1)');
    console.log('\n📌 UUIDs fixes :');
    console.log(`  COM101  : ${COURSE_COM101_ID}`);
    console.log(`  INFO101 : ${COURSE_INFO101_ID}`);
    console.log(`  MKT201  : ${COURSE_MKT201_ID}`);
    console.log(`  DATA301 : ${COURSE_DATA301_ID}`);

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Erreur :', err);
    process.exit(1);
  }
}

runSeed();
