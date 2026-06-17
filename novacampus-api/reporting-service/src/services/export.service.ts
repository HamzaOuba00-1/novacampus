/**
 * services/export.service.ts
 * ---------------------------------------------------------------
 * Service de génération asynchrone de rapports exportables.
 *
 * Architecture async :
 *   1. Créer un ExportJob en base (status: 'pending') → retourner jobId
 *   2. Traiter l'export en arrière-plan (setImmediate)
 *   3. Mettre à jour le job (status: 'ready' + filePath)
 *   4. GET /api/reports/export/:jobId → retourner le statut + lien
 * ---------------------------------------------------------------
 */

import fs from 'fs';
import path from 'path';
import ExportJob from '../models/exportJob.model';

const EXPORT_DIR = './exports';

// Créer le dossier d'export si nécessaire
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

/**
 * Convertit un tableau d'objets en CSV.
 */
function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Génère les données brutes selon le type de rapport.
 * En production, ces données viennent des APIs des autres services.
 */
async function generateReportData(
  reportType: string,
  filters: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  // Simulation de données pour la démo
  // En production : appels aux services académique, paiement, etc.
  switch (reportType) {
    case 'students':
      return [
        { studentNumber: 'STU-2023-0001', firstName: 'Camille', lastName: 'Dupont', status: 'active', program: 'Bachelor Commerce', attendanceRate: '92%', avgGrade: '14.5', paymentStatus: 'up_to_date' },
        { studentNumber: 'STU-2023-0002', firstName: 'Ahmed', lastName: 'Benali', status: 'active', program: 'Bachelor Informatique', attendanceRate: '67%', avgGrade: '9.8', paymentStatus: 'overdue' },
      ];
    case 'attendance':
      return [
        { courseCode: 'COM101', courseName: 'Introduction au Commerce', avgAttendance: '88%', atRiskCount: 2, totalStudents: 25 },
        { courseCode: 'INFO101', courseName: 'Programmation Python', avgAttendance: '79%', atRiskCount: 5, totalStudents: 30 },
      ];
    case 'revenue':
      return [
        { campusId: filters['campusId'] ?? 'ALL', academicYear: filters['academicYear'] ?? 2024, totalInvoiced: 180000, totalCollected: 152000, defaultRate: '15.6%', pendingCount: 12 },
      ];
    case 'ai_alerts':
      return [
        { alertId: 'uuid-1', type: 'dropout_risk', severity: 'high', studentId: 'uuid-student', score: '0.78', status: 'open', createdAt: new Date().toISOString() },
      ];
    case 'kpis':
      return [
        { campus: 'Novacampus Paris', students: 850, successRate: '82%', attendanceRate: '81%', revenue: 3612500, roomOccupancy: '65%' },
        { campus: 'Novacampus Lyon', students: 520, successRate: '79%', attendanceRate: '77%', revenue: 2340000, roomOccupancy: '58%' },
      ];
    default:
      return [];
  }
}

/**
 * Crée un job d'export et démarre le traitement en arrière-plan.
 * Retourne immédiatement le jobId sans attendre la fin du traitement.
 */
export async function createExportJob(
  requestedBy: string,
  reportType: string,
  format: 'csv' | 'json',
  filters: Record<string, unknown>
): Promise<{ jobId: string; status: string }> {
  const job = await ExportJob.create({
    requestedBy,
    reportType,
    format,
    filters,
    status: 'pending',
  });

  // Traitement asynchrone non bloquant
  setImmediate(async () => {
    try {
      const data = await generateReportData(reportType, filters);
      const fileName = `${reportType}-${Date.now()}.${format}`;
      const filePath = path.join(EXPORT_DIR, fileName);

      if (format === 'csv') {
        fs.writeFileSync(filePath, toCSV(data as Record<string, unknown>[]));
      } else {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      }

      await job.update({ status: 'ready', filePath, rowCount: data.length });
      console.log(`[ExportService] Job ${job.id} terminé – ${data.length} lignes → ${filePath}`);
    } catch (err) {
      await job.update({ status: 'failed', errorMessage: (err as Error).message });
      console.error(`[ExportService] Job ${job.id} échoué:`, (err as Error).message);
    }
  });

  return { jobId: job.id, status: 'pending' };
}

/**
 * Récupère le statut d'un job d'export.
 */
export async function getExportJobStatus(jobId: string) {
  const job = await ExportJob.findByPk(jobId);
  if (!job) throw new Error('Job d\'export introuvable.');

  return {
    jobId: job.id,
    status: job.status,
    reportType: job.reportType,
    format: job.format,
    rowCount: job.rowCount,
    downloadUrl: job.status === 'ready' && job.filePath
      ? `/api/reports/export/${job.id}/download`
      : null,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

/**
 * Retourne le fichier d'export pour le téléchargement.
 */
export async function getExportFile(jobId: string): Promise<{
  filePath: string;
  format: string;
  reportType: string;
} | null> {
  const job = await ExportJob.findByPk(jobId);
  if (!job || job.status !== 'ready' || !job.filePath) return null;
  if (!fs.existsSync(job.filePath)) return null;
  return { filePath: job.filePath, format: job.format, reportType: job.reportType };
}
