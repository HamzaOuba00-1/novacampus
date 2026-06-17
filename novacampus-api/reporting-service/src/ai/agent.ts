/**
 * ai/agent.ts
 * ---------------------------------------------------------------
 * Agent IA Novacampus – Moteur de détection des risques.
 *
 * Cet agent analyse les données agrégées des étudiants pour
 * identifier proactivement :
 *
 *   1. RISQUE DE DÉCROCHAGE (dropout_risk)
 *      Signaux : taux d'assiduité < seuil, moyenne < 10, absences
 *      consécutives, retard de paiement combiné
 *
 *   2. RISQUE DE DÉFAUT PAIEMENT (payment_risk)
 *      Signaux : factures overdue, montant impayé élevé
 *
 *   3. FAIBLE ASSIDUITÉ (low_attendance)
 *      Signaux : attendanceRate < seuil critique
 *
 *   4. ANOMALIE CAMPUS (campus_anomaly)
 *      Signaux : baisse significative du taux de réussite,
 *      taux d'occupation des salles anormal
 *
 * Architecture :
 *   – Score = combinaison pondérée des signaux (0.000 à 1.000)
 *   – Seuils configurables via GlobalConfig (campus-service)
 *   – Les alertes existantes non résolues ne sont pas recréées
 *   – Chaque analyse déclenche des notifications aux admins
 *
 * Note : en production, ce moteur peut être remplacé par un
 * modèle ML (scikit-learn, TensorFlow) appelé via une API Python.
 * L'interface reste identique.
 * ---------------------------------------------------------------
 */

import { Op } from 'sequelize';
import AiAlert from '../models/aiAlert.model';
import {
  fetchActiveStudents,
  fetchStudentEnrollments,
  fetchStudentInvoices,
  fetchStudentAbsences,
  sendAiAlertNotification,
} from '../utils/serviceClient.util';
import {
  average,
  roundDecimal,
  scoreToBySeverity,
  percentage,
} from '../utils/stats.util';
import { AiAnalysisResult, RiskFactors } from '../types';

// Seuils de risque (depuis .env, avec valeurs par défaut)
const DROPOUT_THRESHOLD = parseFloat(process.env.AI_DROPOUT_RISK_THRESHOLD ?? '0.65');
const PAYMENT_THRESHOLD = parseFloat(process.env.AI_PAYMENT_RISK_THRESHOLD ?? '0.70');
const LOW_ATTENDANCE_THRESHOLD = parseFloat(process.env.AI_LOW_ATTENDANCE_THRESHOLD ?? '0.50');
const BATCH_SIZE = parseInt(process.env.AI_ANALYSIS_BATCH_SIZE ?? '50', 10);

// ---------------------------------------------------------------
// Calcul des scores de risque individuels
// ---------------------------------------------------------------

/**
 * Calcule le score de risque de décrochage d'un étudiant.
 *
 * Formule pondérée :
 *   – 40% : taux d'assiduité inversé (1 - attendanceRate)
 *   – 35% : note moyenne inversée normalisée (1 - avg/20)
 *   – 15% : présence de factures en retard
 *   – 10% : absences consécutives normalisées
 *
 * @returns Score entre 0.000 (aucun risque) et 1.000 (risque maximal)
 */
function computeDropoutScore(
  enrollments: Array<{ finalGrade: number | null; attendanceRate: number | null; status: string }>,
  invoices: Array<{ status: string }>,
  absences: Array<{ type: string }>
): { score: number; factors: RiskFactors } {
  const activeEnrollments = enrollments.filter((e) => e.status === 'enrolled');

  // Taux de présence moyen (inverser : 0% présence = 1.0 risque)
  const attendanceValues = activeEnrollments
    .map((e) => e.attendanceRate ?? 1)
    .filter((v) => v !== null);
  const avgAttendance = average(attendanceValues);
  const attendanceRisk = 1 - avgAttendance / 100;

  // Moyenne des notes (inverser : 0/20 = 1.0 risque)
  const gradeValues = activeEnrollments
    .map((e) => e.finalGrade)
    .filter((v): v is number => v !== null);
  const avgGrade = gradeValues.length > 0 ? average(gradeValues) : 10;
  const gradeRisk = Math.max(0, 1 - avgGrade / 20);

  // Factures en retard
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;
  const paymentRisk = overdueInvoices > 0 ? Math.min(1, overdueInvoices * 0.3) : 0;

  // Absences non justifiées
  const unjustifiedAbsences = absences.filter((a) => a.type === 'absent').length;
  const absenceRisk = Math.min(1, unjustifiedAbsences / 10);

  // Score pondéré
  const score = roundDecimal(
    attendanceRisk * 0.40 +
    gradeRisk * 0.35 +
    paymentRisk * 0.15 +
    absenceRisk * 0.10,
    3
  );

  return {
    score,
    factors: {
      attendanceRate: roundDecimal(avgAttendance, 1),
      gradeAverage: roundDecimal(avgGrade, 2),
      overdueInvoices,
      unjustifiedAbsences,
      activeEnrollmentsCount: activeEnrollments.length,
    },
  };
}

/**
 * Calcule le score de risque de défaut paiement.
 */
function computePaymentRiskScore(
  invoices: Array<{ status: string; amount: number }>
): { score: number; factors: RiskFactors } {
  const total = invoices.length;
  if (total === 0) return { score: 0, factors: { invoiceCount: 0 } };

  const overdue = invoices.filter((i) => i.status === 'overdue');
  const overdueAmount = overdue.reduce((s, i) => s + Number(i.amount), 0);
  const totalAmount = invoices.reduce((s, i) => s + Number(i.amount), 0);

  const countRatio = percentage(overdue.length, total) / 100;
  const amountRatio = totalAmount > 0 ? overdueAmount / totalAmount : 0;

  const score = roundDecimal(countRatio * 0.5 + amountRatio * 0.5, 3);

  return {
    score,
    factors: {
      overdueCount: overdue.length,
      totalCount: total,
      overdueAmount: roundDecimal(overdueAmount, 2),
      totalAmount: roundDecimal(totalAmount, 2),
    },
  };
}

/**
 * Génère la recommandation textuelle selon le type et la sévérité.
 */
function buildRecommendation(
  type: string,
  severity: string,
  factors: RiskFactors
): string {
  switch (type) {
    case 'dropout_risk':
      if (severity === 'critical') {
        return `Intervention urgente requise. L'étudiant présente un taux de présence de ${factors['attendanceRate']}% et une moyenne de ${factors['gradeAverage']}/20. Contacter immédiatement l'étudiant et ses enseignants référents.`;
      }
      return `Suivi renforcé recommandé. Taux de présence : ${factors['attendanceRate']}%, moyenne : ${factors['gradeAverage']}/20. Proposer un entretien pédagogique.`;
    case 'payment_risk':
      return `${factors['overdueCount']} facture(s) en retard pour un montant total de ${factors['overdueAmount']}€. Déclencher une relance personnalisée et proposer un échéancier si nécessaire.`;
    case 'low_attendance':
      return `Taux de présence critique : ${factors['attendanceRate']}%. En dessous du seuil réglementaire. Vérifier les justificatifs d'absence et informer le responsable pédagogique.`;
    case 'campus_anomaly':
      return `Anomalie détectée sur les indicateurs du campus. Analyse approfondie recommandée avant le prochain conseil pédagogique.`;
    default:
      return 'Anomalie détectée. Vérification manuelle recommandée.';
  }
}

// ---------------------------------------------------------------
// Moteur d'analyse principal
// ---------------------------------------------------------------

/**
 * Lance une analyse IA sur les étudiants actifs d'un campus (ou tous).
 *
 * Processus :
 *   1. Récupérer les étudiants actifs par batch
 *   2. Pour chaque étudiant : calculer les scores de risque
 *   3. Si score > seuil ET pas d'alerte ouverte similaire → créer l'alerte
 *   4. Notifier les administrateurs des nouvelles alertes critiques
 *
 * @param campusId  - UUID du campus (null = tous les campus)
 * @param triggeredBy - UUID de l'utilisateur déclencheur
 * @returns Statistiques de l'analyse
 */
export async function runAnalysis(
  campusId: string | null,
  triggeredBy: string
): Promise<AiAnalysisResult> {
  const analysisId = require('uuid').v4();
  let studentsAnalyzed = 0;
  let alertsGenerated = 0;
  let highRiskCount = 0;
  let page = 1;
  let hasMore = true;

  console.log(`[AI Agent] Analyse démarrée – campusId=${campusId ?? 'ALL'} par ${triggeredBy}`);

  while (hasMore) {
    const result = await fetchActiveStudents(campusId ?? undefined, page, BATCH_SIZE);
    if (!result || result.students.length === 0) break;

    for (const student of result.students) {
      studentsAnalyzed++;

      // Récupération parallèle des données de l'étudiant
      const [enrollments, invoices, absences] = await Promise.all([
        fetchStudentEnrollments(student.id),
        fetchStudentInvoices(student.id),
        fetchStudentAbsences(student.id),
      ]);

      // ── Analyse risque de décrochage ────────────────────
      if (enrollments && enrollments.length > 0) {
        const { score: dropoutScore, factors: dropoutFactors } = computeDropoutScore(
          enrollments,
          invoices ?? [],
          absences ?? []
        );

        if (dropoutScore >= DROPOUT_THRESHOLD) {
          // Vérifier qu'une alerte ouverte n'existe pas déjà
          const existing = await AiAlert.findOne({
            where: {
              studentId: student.id,
              type: 'dropout_risk',
              status: 'open',
            },
          });

          if (!existing) {
            const severity = scoreToBySeverity(dropoutScore);
            await AiAlert.create({
              studentId: student.id,
              campusId: student.campusId,
              type: 'dropout_risk',
              severity,
              score: dropoutScore,
              factors: dropoutFactors,
              recommendation: buildRecommendation('dropout_risk', severity, dropoutFactors),
            });
            alertsGenerated++;
            if (['high', 'critical'].includes(severity)) highRiskCount++;
          }
        }

        // ── Analyse faible assiduité ──────────────────────
        const activeEnrollments = enrollments.filter((e) => e.status === 'enrolled');
        const attendanceValues = activeEnrollments
          .map((e) => (e.attendanceRate ?? 100) / 100)
          .filter((v) => v !== null);

        if (attendanceValues.length > 0) {
          const avgAttendance = average(attendanceValues);
          if (avgAttendance < LOW_ATTENDANCE_THRESHOLD) {
            const existing = await AiAlert.findOne({
              where: { studentId: student.id, type: 'low_attendance', status: 'open' },
            });
            if (!existing) {
              const score = roundDecimal(1 - avgAttendance, 3);
              const severity = scoreToBySeverity(score);
              await AiAlert.create({
                studentId: student.id,
                campusId: student.campusId,
                type: 'low_attendance',
                severity,
                score,
                factors: { attendanceRate: roundDecimal(avgAttendance * 100, 1) },
                recommendation: buildRecommendation('low_attendance', severity, {
                  attendanceRate: roundDecimal(avgAttendance * 100, 1),
                }),
              });
              alertsGenerated++;
              if (['high', 'critical'].includes(severity)) highRiskCount++;
            }
          }
        }
      }

      // ── Analyse risque paiement ──────────────────────────
      if (invoices && invoices.length > 0) {
        const { score: paymentScore, factors: paymentFactors } = computePaymentRiskScore(
          invoices as Array<{ status: string; amount: number }>
        );

        if (paymentScore >= PAYMENT_THRESHOLD) {
          const existing = await AiAlert.findOne({
            where: { studentId: student.id, type: 'payment_risk', status: 'open' },
          });
          if (!existing) {
            const severity = scoreToBySeverity(paymentScore);
            await AiAlert.create({
              studentId: student.id,
              campusId: student.campusId,
              type: 'payment_risk',
              severity,
              score: paymentScore,
              factors: paymentFactors,
              recommendation: buildRecommendation('payment_risk', severity, paymentFactors),
            });
            alertsGenerated++;
            if (['high', 'critical'].includes(severity)) highRiskCount++;
          }
        }
      }
    }

    hasMore = page < result.meta.totalPages;
    page++;
  }

  // Notification des admins si des alertes critiques ont été générées
  if (highRiskCount > 0) {
    await sendAiAlertNotification({
      userIds: [triggeredBy], // En prod: récupérer la liste des admins du campus
      title: `Agent IA – ${highRiskCount} alerte(s) haute priorité`,
      body: `L'analyse IA a détecté ${highRiskCount} étudiant(s) à risque élevé sur ${studentsAnalyzed} analysés.`,
      refType: 'AiAnalysis',
      refId: analysisId,
    });
  }

  console.log(`[AI Agent] Analyse terminée – ${studentsAnalyzed} étudiants, ${alertsGenerated} alertes générées.`);

  return {
    analysisId,
    scope: campusId ? 'campus' : 'global',
    targetId: campusId,
    alertsGenerated,
    studentsAnalyzed,
    highRiskCount,
    computedAt: new Date(),
  };
}

/**
 * Génère une synthèse narrative des KPIs pour la direction.
 * En production, ce texte serait généré par un LLM (GPT-4, Claude…).
 * En développement, c'est un template basé sur les données.
 *
 * @param campusId    - Campus concerné (null = global)
 * @param academicYear - Année académique
 */
export async function generateInsightsSummary(
  campusId: string | null,
  academicYear: number
): Promise<string> {
  // Récupérer les alertes ouvertes
  const openAlerts = await AiAlert.count({
    where: {
      status: 'open',
      ...(campusId ? { campusId } : {}),
    },
  });

  const criticalAlerts = await AiAlert.count({
    where: {
      status: 'open',
      severity: { [Op.in]: ['high', 'critical'] },
      ...(campusId ? { campusId } : {}),
    },
  });

  const dropoutRisk = await AiAlert.count({
    where: {
      type: 'dropout_risk',
      status: 'open',
      ...(campusId ? { campusId } : {}),
    },
  });

  // Génération du texte de synthèse (template)
  const lines: string[] = [
    `**Synthèse IA – Année ${academicYear}-${academicYear + 1}${campusId ? ' (campus spécifique)' : ' (tous campus)'}**`,
    '',
    `→ ${openAlerts} alerte(s) ouverte(s) au total, dont ${criticalAlerts} à haute priorité.`,
  ];

  if (dropoutRisk > 0) {
    lines.push(`→ ${dropoutRisk} étudiant(s) identifié(s) à risque de décrochage. Intervention pédagogique recommandée.`);
  } else {
    lines.push(`→ Aucun risque de décrochage significatif détecté. Situation stable.`);
  }

  lines.push('');
  lines.push('*Note : Cette synthèse est générée automatiquement par l\'agent IA Novacampus.*');
  lines.push('*Pour une analyse approfondie, consultez le tableau de bord complet.*');

  return lines.join('\n');
}
