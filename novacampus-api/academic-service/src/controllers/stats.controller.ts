/**
 * controllers/stats.controller.ts  [NOUVEAU FICHIER]
 * ---------------------------------------------------------------
 * Endpoint agrégé de statistiques académiques par campus.
 * Utilisé par le reporting-service pour calculer les KPIs réels.
 *
 * GET /api/stats/campus/:campusId?academicYear=2024
 * Accès : admin, direction (+ X-Internal-Service pour reporting)
 * ---------------------------------------------------------------
 */

import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../types';
import Enrollment from '../models/enrollment.model';
import AcademicRecord from '../models/academicRecord.model';
import Program from '../models/program.model';

/**
 * GET /api/stats/campus/:campusId
 * Retourne les statistiques agrégées pour un campus :
 *   – avgAttendanceRate : taux de présence moyen de tous les étudiants actifs
 *   – successRate       : % d'étudiants ayant validé leur année (AcademicRecord)
 *   – totalEnrollments  : nombre total d'inscriptions actives
 *   – totalGraded       : nombre d'inscriptions avec une note finale
 */
export async function getCampusStats(req: AuthenticatedRequest, res: Response) {
  try {
    const { campusId } = req.params;
    const { academicYear } = req.query as { academicYear?: string };
    const year = academicYear ? parseInt(academicYear, 10) : new Date().getFullYear();

    // ── Récupérer les programmes du campus ──────────────────
    const programs = await Program.findAll({
      where: { campusId, status: 'active' },
      attributes: ['id'],
    });
    const programIds = programs.map((p) => p.id);

    if (programIds.length === 0) {
      res.status(200).json({
        status: 'success',
        data: {
          campusId,
          academicYear: year,
          avgAttendanceRate: 0,
          successRate: 0,
          totalEnrollments: 0,
          totalGraded: 0,
        },
      });
      return;
    }

    // ── Inscriptions actives des cours de ces programmes ────
    const enrollments = await Enrollment.findAll({
      where: {
        academicYear: year,
        status: { [Op.in]: ['enrolled', 'validated', 'failed'] },
      },
      include: [
        {
          // Filtrer seulement les cours des programmes du campus
          association: 'course',
          where: { programId: { [Op.in]: programIds } },
          required: true,
          attributes: [],
        },
      ],
      attributes: ['id', 'attendanceRate', 'finalGrade', 'status'],
    });

    const totalEnrollments = enrollments.length;

    // ── Taux de présence moyen ───────────────────────────────
    const attendanceValues = enrollments
      .map((e) => Number(e.attendanceRate))
      .filter((v) => !isNaN(v) && v !== null);

    const avgAttendanceRate =
      attendanceValues.length > 0
        ? Math.round(
            (attendanceValues.reduce((s, v) => s + v, 0) / attendanceValues.length) * 100
          ) / 100
        : 0;

    // ── Taux de réussite depuis AcademicRecord ───────────────
    // Un étudiant a "réussi" s'il a un AcademicRecord validated pour cette année
    // dans l'un des programmes du campus
    const totalRecords = await AcademicRecord.count({
      where: {
        programId: { [Op.in]: programIds },
        academicYear: year,
      },
    });

    const validatedRecords = await AcademicRecord.count({
      where: {
        programId: { [Op.in]: programIds },
        academicYear: year,
        result: 'validated',
      },
    });

    const successRate =
      totalRecords > 0
        ? Math.round((validatedRecords / totalRecords) * 100 * 100) / 100
        : 0;

    const totalGraded = enrollments.filter(
      (e) => e.finalGrade !== null && e.finalGrade !== undefined
    ).length;

    res.status(200).json({
      status: 'success',
      data: {
        campusId,
        academicYear: year,
        avgAttendanceRate,
        successRate,
        totalEnrollments,
        totalGraded,
        programCount: programIds.length,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'failure',
      code: 'ERR_CAMPUS_STATS',
      message: (err as Error).message,
    });
  }
}
