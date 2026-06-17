/**
 * services/kpi.service.ts
 * ---------------------------------------------------------------
 * CORRECTIONS APPLIQUÉES :
 *   1. Campus dynamiques via fetchAllCampusIds() — plus de tableau hardcodé
 *   2. avgAttendanceRate depuis academic-service (fetchAcademicStats)
 *   3. successRate depuis academic-service (fetchAcademicStats)
 *   4. roomOccupancyRate depuis planning-service (fetchRoomOccupancy)
 * ---------------------------------------------------------------
 */

import { Op } from 'sequelize';
import KpiSnapshotModel from '../models/kpiSnapshot.model';
import {
  fetchPaymentStats,
  fetchStudentStats,
  fetchCampusCapacity,
  fetchAcademicStats,
  fetchRoomOccupancy,
  fetchAllCampusIds,
} from '../utils/serviceClient.util';
import { percentage, roundDecimal, isCacheValid } from '../utils/stats.util';
import { KpiSnapshot, DirectionDashboard } from '../types';

const KPI_CACHE_TTL = parseInt(process.env.KPI_CACHE_TTL_MINUTES ?? '60', 10);

// ---------------------------------------------------------------
// Calcul d'un snapshot KPI pour un campus
// ---------------------------------------------------------------

/**
 * Calcule et persiste un snapshot KPI pour un campus.
 * CORRIGÉ : avgAttendanceRate, successRate et roomOccupancyRate
 * sont maintenant récupérés depuis les services sources réels.
 */
async function computeAndSave(
  campusId: string,
  academicYear: number,
  semester: number | null
): Promise<KpiSnapshot> {
  // Récupération parallèle depuis tous les services sources
  const [paymentStats, studentStats, campusData, academicStats, roomStats] =
    await Promise.all([
      fetchPaymentStats(campusId, academicYear),
      fetchStudentStats(campusId),
      fetchCampusCapacity(campusId),
      // CORRECTION : vraies données depuis academic-service
      fetchAcademicStats(campusId, academicYear),
      // CORRECTION : vraies données depuis planning-service
      fetchRoomOccupancy(campusId, academicYear),
    ]);

  const totalStudents     = studentStats?.total          ?? 0;
  const activeStudents    = studentStats?.active         ?? 0;
  const capacityStudents  = campusData?.capacityStudents ?? 1;

  // CORRECTION : avgAttendanceRate réel (plus de 78.5 hardcodé)
  const avgAttendanceRate = academicStats?.avgAttendanceRate ?? 0;

  // CORRECTION : successRate réel (plus de 82.3 hardcodé)
  const successRate       = academicStats?.successRate       ?? 0;

  // CORRECTION : roomOccupancyRate réel (plus de 65.0 hardcodé)
  const roomOccupancyRate = roomStats?.occupancyRate         ?? 0;

  const snapshot: Omit<KpiSnapshot, 'computedAt'> = {
    campusId,
    academicYear,
    semester,
    totalStudents,
    activeStudents,
    enrollmentRate:     percentage(activeStudents, capacityStudents),
    avgAttendanceRate,
    successRate,
    totalRevenue:       roundDecimal(paymentStats?.totalCollected ?? 0, 2),
    defaultRate:        roundDecimal(paymentStats?.overdueRate    ?? 0, 2),
    roomOccupancyRate,
  };

  // Upsert du snapshot (remplace si déjà existant pour ce campus/année/semestre)
  await KpiSnapshotModel.upsert({
    ...snapshot,
    computedAt: new Date(),
  });

  console.log(`[KpiService] Snapshot calculé — campus ${campusId} | ${academicYear} | présence ${avgAttendanceRate}% | réussite ${successRate}%`);

  return { ...snapshot, computedAt: new Date() };
}

/**
 * Retourne le KPI d'un campus avec gestion du cache.
 */
export async function getKpiForCampus(
  campusId: string,
  academicYear: number,
  semester?: number
): Promise<KpiSnapshot> {
  const existing = await KpiSnapshotModel.findOne({
    where: { campusId, academicYear, semester: semester ?? null },
  });

  if (existing && isCacheValid(existing.computedAt, KPI_CACHE_TTL)) {
    return existing.toJSON() as KpiSnapshot;
  }

  return computeAndSave(campusId, academicYear, semester ?? null);
}

/**
 * KPIs consolidés de tous les campus pour la direction.
 * CORRECTION : campus récupérés dynamiquement depuis le campus-service.
 * Plus de tableau d'UUIDs hardcodés — tout nouveau campus est automatiquement inclus.
 */
export async function getAllCampusKpis(
  academicYear: number,
  semester?: number,
  forceRefresh = false
): Promise<KpiSnapshot[]> {
  const where: Record<string, unknown> = {
    academicYear,
    semester: semester ?? null,
  };

  // Retourner le cache si valide et pas de refresh forcé
  if (!forceRefresh) {
    const cached = await KpiSnapshotModel.findAll({
      where: {
        ...where,
        computedAt: { [Op.gte]: new Date(Date.now() - KPI_CACHE_TTL * 60 * 1000) },
      },
    });
    if (cached.length > 0) {
      console.log(`[KpiService] Cache valide — ${cached.length} campus retournés depuis le cache`);
      return cached.map((c) => c.toJSON() as KpiSnapshot);
    }
  }

  // CORRECTION : récupérer les campus dynamiquement
  const campusIds = await fetchAllCampusIds();

  if (campusIds.length === 0) {
    console.warn('[KpiService] Aucun campus actif trouvé depuis le campus-service');
    return [];
  }

  console.log(`[KpiService] Calcul KPIs pour ${campusIds.length} campus actifs`);

  // Calcul en parallèle pour tous les campus
  const snapshots = await Promise.allSettled(
    campusIds.map((campusId) => computeAndSave(campusId, academicYear, semester ?? null))
  );

  // Filtrer les erreurs et retourner les succès
  return snapshots
    .filter((r): r is PromiseFulfilledResult<KpiSnapshot> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Dashboard direction complet avec totaux consolidés.
 */
export async function buildDirectionDashboard(
  academicYear: number
): Promise<DirectionDashboard> {
  const campuses = await getAllCampusKpis(academicYear);

  const totals = {
    students: campuses.reduce((s, c) => s + c.activeStudents, 0),
    revenue:  roundDecimal(campuses.reduce((s, c) => s + Number(c.totalRevenue), 0), 2),
    avgSuccessRate: roundDecimal(
      campuses.length > 0
        ? campuses.reduce((s, c) => s + c.successRate, 0) / campuses.length
        : 0,
      2
    ),
    avgAttendanceRate: roundDecimal(
      campuses.length > 0
        ? campuses.reduce((s, c) => s + c.avgAttendanceRate, 0) / campuses.length
        : 0,
      2
    ),
    openAlerts: 0, // enrichi dans le controller
  };

  return {
    generatedAt: new Date(),
    academicYear,
    campuses,
    totals,
  };
}

/**
 * KPIs par programme pour un campus.
 */
export async function getKpisByProgram(campusId: string, academicYear: number) {
  // Récupérer depuis academic-service
  const result = await import('../utils/serviceClient.util').then((m) =>
    m.fetchAcademicStats(campusId, academicYear)
  );

  // Simulation si le service ne retourne pas encore de données par programme
  if (!result) {
    return [
      { programName: 'Données indisponibles', successRate: 0, avgGrade: 0, enrollmentCount: 0 },
    ];
  }

  // TODO: quand academic-service expose /api/stats/campus/:id/programs
  return [
    { programName: 'Données agrégées', successRate: result.successRate, avgGrade: 0, enrollmentCount: result.totalEnrollments },
  ];
}
