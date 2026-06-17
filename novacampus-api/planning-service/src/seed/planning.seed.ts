/**
 * seed/planning.seed.ts
 * ---------------------------------------------------------------
 * Peuplement initial de la base de planification – VERSION CORRIGÉE
 *
 * CORRECTIONS vs la version précédente :
 *   1. Ajout des créneaux pour MKT201 et DATA301 (nouveaux cours de Dupont)
 *   2. scheduleId des créneaux COM101 est un UUID fixe connu
 *      → utilisé dans academic.seed pour créer les absences de Dupont
 *   3. Créneaux sur l'année 2024 (plus cohérent avec la date actuelle)
 *
 * UUIDs des cours – IDENTIQUES à academic.seed.ts :
 *   COM101  : 66666666-6666-6666-6666-666666666666
 *   INFO101 : 77777777-7777-7777-7777-777777777777
 *   MKT201  : cccccccc-1111-1111-1111-cccccccccccc
 *   DATA301 : dddddddd-1111-1111-1111-dddddddddddd
 *
 * Idempotent. Désactivé en prod.
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import sequelize from '../config/database.config';
import Room from '../models/room.model';
import RoomEquipment from '../models/roomEquipment.model';
import Schedule from '../models/schedule.model';
import ScheduleException from '../models/scheduleException.model';
import RoomConflict from '../models/roomConflict.model';

if (process.env.NODE_ENV === 'prod') {
  console.log('[Seed] NODE_ENV=prod – seed désactivée en production.');
  process.exit(0);
}

// ---------------------------------------------------------------
// UUIDs fixes – cohérents avec les autres seeds
// ---------------------------------------------------------------
const CAMPUS_PARIS_ID = '11111111-1111-1111-1111-111111111111';
const CAMPUS_LYON_ID  = '55555555-5555-5555-5555-555555555555';
const INSTRUCTOR_ID   = '22222222-2222-2222-2222-222222222222';
const ADMIN_ID        = '88888888-8888-8888-8888-888888888888';

// UUIDs des cours – IDENTIQUES à academic.seed.ts
const COURSE_COM101_ID  = '66666666-6666-6666-6666-666666666666';
const COURSE_INFO101_ID = '77777777-7777-7777-7777-777777777777';
const COURSE_MKT201_ID  = 'cccccccc-1111-1111-1111-cccccccccccc';
const COURSE_DATA301_ID = 'dddddddd-1111-1111-1111-dddddddddddd';

// UUIDs FIXES des créneaux COM101 (référencés dans academic.seed pour les absences)
const SCHEDULE_COM101_MON_ID = 'eeeeeeee-1111-1111-1111-eeeeeeeeeeee';
const SCHEDULE_COM101_TUE_ID = 'ffffffff-1111-1111-1111-ffffffffffff';

async function runSeed(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Seed] Connexion DB établie.');
    await sequelize.sync({ alter: true });
    console.log('[Seed] Modèles synchronisés.');

    // ═══════════════════════════════════════════════════════════
    // SALLES – Campus Paris
    // ═══════════════════════════════════════════════════════════

    const roomsData = [
      { code: 'P-AMPHI-01', name: 'Grand Amphithéâtre',     building: 'Bâtiment A', floor: 0, capacity: 300, type: 'amphitheater' as const },
      { code: 'P-TD-101',   name: 'Salle de TD 101',        building: 'Bâtiment B', floor: 1, capacity: 30,  type: 'td' as const },
      { code: 'P-TD-102',   name: 'Salle de TD 102',        building: 'Bâtiment B', floor: 1, capacity: 30,  type: 'td' as const },
      { code: 'P-LAB-01',   name: 'Laboratoire Informatique', building: 'Bâtiment C', floor: 2, capacity: 25, type: 'lab' as const },
      { code: 'P-SEM-01',   name: 'Salle Séminaire',        building: 'Bâtiment A', floor: 1, capacity: 15,  type: 'seminar' as const },
      { code: 'L-TD-201',   name: 'Salle 201 Lyon',         building: 'Bâtiment Principal', floor: 2, capacity: 35, type: 'td' as const },
    ];

    const createdRooms: Record<string, Room> = {};
    for (const rd of roomsData) {
      let room = await Room.findOne({ where: { code: rd.code } });
      if (!room) {
        room = await Room.create({ campusId: CAMPUS_PARIS_ID, ...rd });
        console.log(`[Seed] Salle créée : ${rd.code}`);
      }
      createdRooms[rd.code] = room;
    }

    // Équipements
    const equipData = [
      { code: 'P-AMPHI-01', type: 'projector' as const, qty: 2 },
      { code: 'P-AMPHI-01', type: 'audio'     as const, qty: 1 },
      { code: 'P-LAB-01',   type: 'pc'        as const, qty: 25 },
      { code: 'P-LAB-01',   type: 'projector' as const, qty: 1 },
      { code: 'P-TD-101',   type: 'whiteboard' as const, qty: 1 },
      { code: 'P-TD-102',   type: 'whiteboard' as const, qty: 1 },
    ];
    for (const eq of equipData) {
      await RoomEquipment.findOrCreate({
        where: { roomId: createdRooms[eq.code].id, equipmentType: eq.type },
        defaults: {
          roomId: createdRooms[eq.code].id,
          equipmentType: eq.type,
          quantity: eq.qty,
        },
      });
    }
    console.log('[Seed] Équipements configurés');

    // ═══════════════════════════════════════════════════════════
    // CRÉNEAUX – Année 2023, Semestre 1 (S1)
    // UUIDs FIXES pour COM101 → utilisés dans les absences Dupont
    // ═══════════════════════════════════════════════════════════

    // COM101 – Lundi 08:30-10:30 (UUID fixe)
    let schedCom101Mon = await Schedule.findByPk(SCHEDULE_COM101_MON_ID);
    if (!schedCom101Mon) {
      schedCom101Mon = await Schedule.create({
        id: SCHEDULE_COM101_MON_ID,
        courseId: COURSE_COM101_ID,
        instructorId: INSTRUCTOR_ID,
        roomId: createdRooms['P-TD-101'].id,
        academicYear: 2023, semester: 1,
        dayOfWeek: 0,       // Lundi
        startTime: '08:30', endTime: '10:30',
      });
      console.log('[Seed] Créneau créé : COM101 – Lundi 08:30 (UUID fixe)');
    }

    // COM101 – Mardi 10:00-12:00 (UUID fixe)
    let schedCom101Tue = await Schedule.findByPk(SCHEDULE_COM101_TUE_ID);
    if (!schedCom101Tue) {
      schedCom101Tue = await Schedule.create({
        id: SCHEDULE_COM101_TUE_ID,
        courseId: COURSE_COM101_ID,
        instructorId: INSTRUCTOR_ID,
        roomId: createdRooms['P-TD-102'].id,
        academicYear: 2023, semester: 1,
        dayOfWeek: 1,       // Mardi
        startTime: '10:00', endTime: '12:00',
      });
      console.log('[Seed] Créneau créé : COM101 – Mardi 10:00 (UUID fixe)');
    }

    // INFO101 – Mercredi 14:00-17:00 (labo)
    let schedInfo101 = await Schedule.findOne({
      where: { courseId: COURSE_INFO101_ID, dayOfWeek: 2, academicYear: 2023 },
    });
    if (!schedInfo101) {
      schedInfo101 = await Schedule.create({
        courseId: COURSE_INFO101_ID,
        instructorId: INSTRUCTOR_ID,
        roomId: createdRooms['P-LAB-01'].id,
        academicYear: 2023, semester: 1,
        dayOfWeek: 2,       // Mercredi
        startTime: '14:00', endTime: '17:00',
      });
      console.log('[Seed] Créneau créé : INFO101 – Mercredi 14:00');
    }

    // ═══════════════════════════════════════════════════════════
    // CRÉNEAUX – Année 2023, Semestre 2 (S2)
    // Cours de Dupont : MKT201 et DATA301
    // ═══════════════════════════════════════════════════════════

    // MKT201 – Jeudi 09:00-11:00
    let schedMkt201 = await Schedule.findOne({
      where: { courseId: COURSE_MKT201_ID, dayOfWeek: 3, academicYear: 2023 },
    });
    if (!schedMkt201) {
      schedMkt201 = await Schedule.create({
        courseId: COURSE_MKT201_ID,
        instructorId: INSTRUCTOR_ID,
        roomId: createdRooms['P-TD-101'].id,
        academicYear: 2023, semester: 2,
        dayOfWeek: 3,       // Jeudi
        startTime: '09:00', endTime: '11:00',
      });
      console.log('[Seed] Créneau créé : MKT201 – Jeudi 09:00');
    }

    // DATA301 – Vendredi 13:30-16:30 (labo)
    let schedData301 = await Schedule.findOne({
      where: { courseId: COURSE_DATA301_ID, dayOfWeek: 4, academicYear: 2023 },
    });
    if (!schedData301) {
      schedData301 = await Schedule.create({
        courseId: COURSE_DATA301_ID,
        instructorId: INSTRUCTOR_ID,
        roomId: createdRooms['P-LAB-01'].id,
        academicYear: 2023, semester: 2,
        dayOfWeek: 4,       // Vendredi
        startTime: '13:30', endTime: '16:30',
      });
      console.log('[Seed] Créneau créé : DATA301 – Vendredi 13:30');
    }

    // ═══════════════════════════════════════════════════════════
    // EXCEPTION – changement de salle pour COM101
    // ═══════════════════════════════════════════════════════════

    const excepExists = await ScheduleException.findOne({
      where: { scheduleId: SCHEDULE_COM101_MON_ID },
    });
    if (!excepExists) {
      await ScheduleException.create({
        scheduleId: SCHEDULE_COM101_MON_ID,
        exceptionDate: '2024-01-22',
        type: 'room_change',
        newRoomId: createdRooms['P-AMPHI-01'].id,
        reason: 'Travaux dans le bâtiment B – déplacement en amphithéâtre.',
        createdBy: ADMIN_ID,
      });
      console.log('[Seed] Exception créée : COM101 Lun – changement de salle 22/01/2024');
    }

    // ═══════════════════════════════════════════════════════════
    // RÉSUMÉ
    // ═══════════════════════════════════════════════════════════

    console.log('\n✅ [Seed] Terminée avec succès.');
    console.log('\n📅 Emploi du temps de Dupont :');
    console.log('  Lundi    08:30-10:30 → COM101 (P-TD-101)');
    console.log('  Mardi    10:00-12:00 → COM101 (P-TD-102)');
    console.log('  Jeudi    09:00-11:00 → MKT201 (P-TD-101) [S2]');
    console.log('  Vendredi 13:30-16:30 → DATA301 (P-LAB-01) [S2]');
    console.log('\n📌 UUIDs créneaux fixes (absences) :');
    console.log(`  COM101 Lundi  : ${SCHEDULE_COM101_MON_ID}`);
    console.log(`  COM101 Mardi  : ${SCHEDULE_COM101_TUE_ID}`);

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Erreur :', err);
    process.exit(1);
  }
}

runSeed();
