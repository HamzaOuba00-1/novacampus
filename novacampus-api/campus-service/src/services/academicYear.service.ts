/**
 * services/academicYear.service.ts
 * ---------------------------------------------------------------
 * Logique métier pour la gestion du référentiel des années
 * académiques.
 *
 * Fonctionnalités :
 *   – Listing de toutes les années
 *   – Création d'une nouvelle année avec ses dates de semestres
 *   – Définition de l'année courante (un seul isCurrent=true)
 *   – Calcul automatique du semestre actif selon la date du jour
 * ---------------------------------------------------------------
 */

import sequelize from '../config/database.config';
import AcademicYear from '../models/academicYear.model';
import { createAuditEntry } from './auditLog.service';

/**
 * Liste toutes les années académiques triées par année décroissante.
 */
export async function listAcademicYears() {
  return AcademicYear.findAll({ order: [['year', 'DESC']] });
}

/**
 * Récupère une année académique par son entier (ex: 2023).
 */
export async function getAcademicYearByYear(year: number) {
  const ay = await AcademicYear.findByPk(year);
  if (!ay) throw new Error(`Année académique ${year} introuvable.`);
  return ay;
}

/**
 * Retourne l'année académique courante.
 */
export async function getCurrentAcademicYear() {
  const ay = await AcademicYear.findOne({ where: { isCurrent: true } });
  if (!ay) throw new Error('Aucune année académique courante définie.');
  return ay;
}

/**
 * Crée une nouvelle année académique.
 * Le label "2023-2024" est généré automatiquement depuis l'entier.
 */
export async function createAcademicYear(
  data: {
    year: number;
    s1Start: Date;
    s1End: Date;
    s2Start: Date;
    s2End: Date;
  },
  actorId: string,
  ipAddress?: string
) {
  const existing = await AcademicYear.findByPk(data.year);
  if (existing) throw new Error(`L'année académique ${data.year} existe déjà.`);

  // Validation de la cohérence des dates
  if (data.s1Start >= data.s1End)
    throw new Error('La date de fin S1 doit être postérieure au début S1.');
  if (data.s2Start >= data.s2End)
    throw new Error('La date de fin S2 doit être postérieure au début S2.');
  if (data.s1End >= data.s2Start)
    throw new Error('Le semestre 2 doit commencer après la fin du semestre 1.');

  const ay = await AcademicYear.create({
    ...data,
    // Génération automatique du label lisible
    label: `${data.year}-${data.year + 1}`,
    isCurrent: false,
  });

  await createAuditEntry({
    actorId,
    action: 'academic_year.create',
    entityType: 'AcademicYear',
    entityId: String(data.year),
    beforeState: null,
    afterState: ay.toJSON() as object,
    ipAddress: ipAddress ?? null,
    campusId: null,
  });

  return ay;
}

/**
 * Définit une année académique comme courante.
 * Utilise une transaction pour garantir qu'une seule année
 * a isCurrent = true à tout moment.
 */
export async function setCurrentAcademicYear(
  year: number,
  actorId: string,
  ipAddress?: string
) {
  const ay = await AcademicYear.findByPk(year);
  if (!ay) throw new Error(`Année académique ${year} introuvable.`);

  // Transaction atomique : réinitialiser TOUS puis activer le bon
  await sequelize.transaction(async (t) => {
    await AcademicYear.update(
      { isCurrent: false },
      { where: {}, transaction: t }
    );
    await ay.update({ isCurrent: true }, { transaction: t });
  });

  await createAuditEntry({
    actorId,
    action: 'academic_year.set_current',
    entityType: 'AcademicYear',
    entityId: String(year),
    beforeState: null,
    afterState: { year, isCurrent: true },
    ipAddress: ipAddress ?? null,
    campusId: null,
  });

  return ay;
}

/**
 * Détermine le semestre actif à la date du jour dans l'année courante.
 * Retourne 1, 2 ou null si hors semestres.
 */
export async function getCurrentSemester(): Promise<{
  year: number;
  semester: number | null;
  label: string;
} | null> {
  try {
    const ay = await getCurrentAcademicYear();
    const today = new Date();

    const s1Start = new Date(ay.s1Start);
    const s1End = new Date(ay.s1End);
    const s2Start = new Date(ay.s2Start);
    const s2End = new Date(ay.s2End);

    let semester: number | null = null;
    if (today >= s1Start && today <= s1End) semester = 1;
    else if (today >= s2Start && today <= s2End) semester = 2;

    return { year: ay.year, semester, label: ay.label };
  } catch {
    return null;
  }
}
