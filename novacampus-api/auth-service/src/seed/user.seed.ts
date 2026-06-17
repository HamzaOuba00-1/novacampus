/**
 * seed/user.seed.ts  [AUTH-SERVICE]
 * ---------------------------------------------------------------
 * CORRECTIONS APPLIQUÉES :
 *
 *   1. Mercier (instructor) a désormais un UUID FIXE
 *      → 22222222-2222-2222-2222-222222222222
 *      Ce UUID est utilisé dans :
 *        – planning.seed.ts    : instructorId des créneaux
 *        – academic.seed.ts    : leadInstructorId des cours, Grade.instructorId
 *        – inscription.seed.ts : Instructor.userId
 *
 *   2. Dupont (student) conserve son UUID FIXE existant
 *      → 33333333-3333-3333-3333-333333333333
 *
 *   3. Admin et Direction ont aussi des UUIDs fixes
 *      pour cohérence avec campus.seed et reporting.seed
 *
 * Idempotent – peut être relancé sans dupliquer.
 * Désactivé en prod.
 * ---------------------------------------------------------------
 */

import sequelize from '../config/database.config';
import User from '../models/user.model';
import { hashPassword } from '../utils/bcrypt.util';

if (process.env.NODE_ENV === 'prod') {
  console.log('[Seed] NODE_ENV=prod détecté — seed désactivée en production.');
  process.exit(0);
}

// ---------------------------------------------------------------
// UUIDs FIXES – référencés par tous les autres services
// ---------------------------------------------------------------
const ADMIN_ID      = '88888888-8888-8888-8888-888888888888';
const DIRECTION_ID  = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const INSTRUCTOR_ID = '22222222-2222-2222-2222-222222222222'; // Mercier
const STUDENT_1_ID  = '33333333-3333-3333-3333-333333333333'; // Dupont
const STUDENT_2_ID  = '44444444-4444-4444-4444-444444444444';

const seedUsers = [
  {
    id: ADMIN_ID,
    email: 'admin@novacampus.fr',
    password: 'Admin123!',
    role: 'admin' as const,
    campusId: null,
  },
  {
    id: DIRECTION_ID,
    email: 'direction@novacampus.fr',
    password: 'Direction123!',
    role: 'direction' as const,
    campusId: null,
  },
  {
    // UUID FIXE – utilisé dans planning.seed (instructorId des créneaux)
    // et academic.seed (leadInstructorId cours, Grade.instructorId)
    id: INSTRUCTOR_ID,
    email: 'prof.mercier@novacampus.fr',
    password: 'Instructor123!',
    role: 'instructor' as const,
    campusId: null,
  },
  {
    // UUID FIXE – utilisé dans academic.seed (enrollments, absences)
    id: STUDENT_1_ID,
    email: 'etudiant.dupont@etu.novacampus.fr',
    password: 'Student123!',
    role: 'student' as const,
    campusId: null,
  },
  {
    id: STUDENT_2_ID,
    email: 'etudiant2@etu.novacampus.fr',
    password: 'Student123!',
    role: 'student' as const,
    campusId: null,
  },
];

async function runSeed(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Seed] Connexion à la base de données établie.');

    await sequelize.sync({ alter: true });
    console.log('[Seed] Modèles synchronisés.');

    let created = 0;
    let skipped = 0;

    for (const userData of seedUsers) {
      const existing = await User.findOne({ where: { email: userData.email } });

      if (existing) {
        // Vérifier que l'UUID est correct – corriger si la seed avait tourné sans UUID fixe
        if (existing.id !== userData.id) {
          console.warn(
            `[Seed] ⚠ UUID mismatch pour ${userData.email}` +
            ` : attendu ${userData.id}, trouvé ${existing.id}.` +
            ` Supprimez la base et relancez la seed pour corriger.`
          );
        } else {
          console.log(`[Seed] Utilisateur existant (UUID OK) — ignoré : ${userData.email}`);
        }
        skipped++;
        continue;
      }

      const passwordHash = await hashPassword(userData.password);

      await User.create({
        id: userData.id,       // UUID FIXE injecté explicitement
        email: userData.email,
        passwordHash,
        role: userData.role,
        campusId: userData.campusId,
        isActive: true,
      });

      console.log(`[Seed] ✅ Utilisateur créé : ${userData.email} (${userData.id})`);
      created++;
    }

    console.log(`\n[Seed] Terminé — ${created} créé(s), ${skipped} ignoré(s).`);
    console.log('\n[Seed] Comptes disponibles :');
    console.log('  admin@novacampus.fr                   → Admin123!');
    console.log('  direction@novacampus.fr               → Direction123!');
    console.log('  prof.mercier@novacampus.fr            → Instructor123!');
    console.log('  etudiant.dupont@etu.novacampus.fr     → Student123!');
    console.log('\n[Seed] UUIDs fixes :');
    console.log(`  Admin      : ${ADMIN_ID}`);
    console.log(`  Direction  : ${DIRECTION_ID}`);
    console.log(`  Mercier    : ${INSTRUCTOR_ID}  ← instructorId dans planning.seed`);
    console.log(`  Dupont     : ${STUDENT_1_ID}  ← studentId dans academic.seed`);

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Erreur :', err);
    process.exit(1);
  }
}

runSeed();
