/**
 * services/absence.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour la gestion des absences.
 *
 * La saisie est conçue pour être faite en batch après chaque séance :
 * l'enseignant envoie la liste complète des étudiants absents/en retard
 * en une seule requête (pas d'appel par étudiant).
 *
 * Après chaque saisie, le taux de présence (attendanceRate) de chaque
 * Enrollment concerné est recalculé automatiquement.
 * ---------------------------------------------------------------
 */

import { Op } from 'sequelize';
import Absence from '../models/absence.model';
import Enrollment from '../models/enrollment.model';
import { AbsenceType } from '../types';

/**
 * Recalcule le taux de présence d'une inscription.
 * Formule : (séances totales - absences non justifiées) / séances totales × 100
 *
 * Une absence "justified" est comptée comme présence dans certains
 * établissements – ici elle est quand même comptée pour la clarté.
 *
 * @param enrollmentId - UUID de l'inscription à recalculer
 */
async function recalculateAttendanceRate(enrollmentId: string): Promise<void> {
  const enrollment = await Enrollment.findByPk(enrollmentId);
  if (!enrollment) return;

  // Nombre total de séances enregistrées (toutes absences confondues)
  const totalAbsences = await Absence.count({ where: { enrollmentId } });

  // On ne peut pas calculer le taux sans connaître le nombre total de séances.
  // En attendant le planning-service, on utilise hoursTotal du cours comme proxy.
  // TODO : récupérer le nombre de séances réelles depuis le planning-service
  if (totalAbsences === 0) {
    await Enrollment.update({ attendanceRate: 100.0 }, { where: { id: enrollmentId } });
    return;
  }

  // Nombre d'absences non justifiées
  const unjustifiedAbsences = await Absence.count({
    where: { enrollmentId, type: { [Op.in]: ['absent', 'late'] } },
  });

  // Calcul simplifié : taux basé sur les séances répertoriées
  const rate = Math.round(
    ((totalAbsences - unjustifiedAbsences) / totalAbsences) * 100 * 100
  ) / 100;

  await Enrollment.update({ attendanceRate: rate }, { where: { id: enrollmentId } });
}

/**
 * Enregistre les absences d'une séance complète en batch.
 * Idempotent : si une absence existe déjà pour ce couple
 * (enrollmentId, scheduleId, sessionDate), elle est ignorée.
 *
 * @param scheduleId  - UUID du créneau (issu du planning-service)
 * @param instructorId - UUID de l'enseignant enregistrant les absences
 * @param sessionDate  - Date de la séance
 * @param entries     - Liste des absences à enregistrer
 */
export async function recordAbsences(
  scheduleId: string,
  instructorId: string,
  sessionDate: Date,
  entries: Array<{ enrollmentId: string; type: AbsenceType }>
) {
  const results: Absence[] = [];
  const affectedEnrollments = new Set<string>();

  for (const entry of entries) {
    // Vérification que l'inscription existe
    const enrollment = await Enrollment.findByPk(entry.enrollmentId);
    if (!enrollment) continue;

    // Idempotence : éviter les doublons pour la même séance
    const existing = await Absence.findOne({
      where: {
        enrollmentId: entry.enrollmentId,
        scheduleId,
        sessionDate,
      },
    });
    if (existing) continue;

    const absence = await Absence.create({
      enrollmentId: entry.enrollmentId,
      scheduleId,
      sessionDate,
      type: entry.type,
      recordedBy: instructorId,
    });

    results.push(absence);
    affectedEnrollments.add(entry.enrollmentId);
  }

  // Recalcul du taux de présence pour chaque étudiant concerné
  for (const enrollmentId of affectedEnrollments) {
    await recalculateAttendanceRate(enrollmentId);
  }

  return { recorded: results.length, total: entries.length };
}

/**
 * Retourne l'historique des absences d'un étudiant.
 * Filtre par cours ou par année si précisé.
 *
 * @param studentId - UUID de l'étudiant (depuis l'auth-service)
 * @param query     - Filtres optionnels (courseId, academicYear)
 */
export async function getAbsencesByStudent(
  studentId: string,
  query: Record<string, string>
) {
  const { courseId, academicYear } = query;

  // Trouver toutes les inscriptions de l'étudiant
  const enrollmentWhere: Record<string, unknown> = { studentId };
  if (courseId) enrollmentWhere['courseId'] = courseId;
  if (academicYear) enrollmentWhere['academicYear'] = parseInt(academicYear, 10);

  const enrollments = await Enrollment.findAll({ where: enrollmentWhere });
  if (enrollments.length === 0) return [];

  const enrollmentIds = enrollments.map((e) => e.id);

  const absences = await Absence.findAll({
    where: { enrollmentId: enrollmentIds },
    order: [['sessionDate', 'DESC']],
  });

  return absences;
}

/**
 * Justifie une absence existante.
 * Réservé aux administrateurs.
 *
 * @param absenceId     - UUID de l'absence à justifier
 * @param justification - Texte de justification
 */
export async function justifyAbsence(absenceId: string, justification: string) {
  const absence = await Absence.findByPk(absenceId);
  if (!absence) throw new Error('Absence introuvable.');

  await absence.update({ type: 'justified', justification });

  // Recalcul du taux de présence après justification
  await recalculateAttendanceRate(absence.enrollmentId);

  return absence;
}
