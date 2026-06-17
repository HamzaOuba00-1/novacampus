/**
 * types/index.ts
 * ---------------------------------------------------------------
 * Interfaces et types TypeScript partagés dans tout le service
 * Reporting / IA. Couvre les KPIs, snapshots, alertes IA,
 * structures de rapport et réponses agrégées.
 * ---------------------------------------------------------------
 */

import { Request } from 'express';

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------
export type UserRole = 'student' | 'instructor' | 'admin' | 'direction';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  campusId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ---------------------------------------------------------------
// Réponse normalisée
// ---------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  status: 'success' | 'failure' | 'pending';
  data?: T;
  message?: string;
  code?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------
// Snapshot KPI par campus / période
// Remplace la table KPI_DASHBOARD statique du fichier Excel
// ---------------------------------------------------------------
export interface KpiSnapshot {
  campusId: string;
  academicYear: number;
  semester: number | null;
  totalStudents: number;
  activeStudents: number;
  enrollmentRate: number;        // % inscriptions / capacité
  avgAttendanceRate: number;     // % présence moyen
  successRate: number;           // % étudiants ayant validé
  totalRevenue: number;          // Revenus encaissés (DECIMAL)
  defaultRate: number;           // % factures en retard
  roomOccupancyRate: number;     // % occupation des salles
  computedAt: Date;
}

// ---------------------------------------------------------------
// Alertes générées par l'agent IA
// ---------------------------------------------------------------
export type AiAlertType =
  | 'dropout_risk'       // Risque de décrochage étudiant
  | 'payment_risk'       // Risque de défaut paiement
  | 'low_attendance'     // Taux d'assiduité critique
  | 'room_underuse'      // Salle sous-utilisée
  | 'campus_anomaly';    // Anomalie KPI campus

export type AiAlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AiAlertStatus = 'open' | 'actioned' | 'dismissed';

// ---------------------------------------------------------------
// Facteurs de risque calculés par l'agent IA
// ---------------------------------------------------------------
export interface RiskFactors {
  attendanceRate?: number;
  gradeAverage?: number;
  paymentStatus?: string;
  absenceCount?: number;
  daysOverdue?: number;
  consecutiveAbsences?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------
// Résultat d'une analyse IA manuelle (POST /ai/analyze)
// ---------------------------------------------------------------
export interface AiAnalysisResult {
  analysisId: string;
  scope: 'student' | 'campus' | 'global';
  targetId: string | null;
  alertsGenerated: number;
  studentsAnalyzed: number;
  highRiskCount: number;
  computedAt: Date;
}

// ---------------------------------------------------------------
// Structure d'un rapport d'export (async)
// ---------------------------------------------------------------
export type ExportFormat = 'json' | 'csv';
export type ExportStatus = 'pending' | 'ready' | 'failed';

// ---------------------------------------------------------------
// Structure agrégée pour le dashboard direction
// ---------------------------------------------------------------
export interface DirectionDashboard {
  generatedAt: Date;
  academicYear: number;
  campuses: KpiSnapshot[];
  totals: {
    students: number;
    revenue: number;
    avgSuccessRate: number;
    avgAttendanceRate: number;
    openAlerts: number;
  };
}
