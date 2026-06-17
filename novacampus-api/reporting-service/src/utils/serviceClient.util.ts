/**
 * utils/serviceClient.util.ts
 * ---------------------------------------------------------------
 * CORRECTIONS APPLIQUÉES :
 *   1. fetchAllCampusIds()      → plus de campus hardcodés
 *   2. sendAiAlertNotification() → authentification inter-service réelle
 *   3. fetchAcademicStats()     → appel réel vers academic-service
 *   4. fetchRoomOccupancy()     → appel réel vers planning-service
 * ---------------------------------------------------------------
 */

const SERVICE_URLS = {
  academic:     process.env.ACADEMIC_SERVICE_URL     ?? 'http://academic-service:3002',
  payment:      process.env.PAYMENT_SERVICE_URL      ?? 'http://payment-service:3005',
  inscription:  process.env.INSCRIPTION_SERVICE_URL  ?? 'http://inscription-service:3004',
  planning:     process.env.PLANNING_SERVICE_URL     ?? 'http://planning-service:3003',
  campus:       process.env.CAMPUS_SERVICE_URL       ?? 'http://campus-service:3007',
  notification: process.env.NOTIFICATION_SERVICE_URL ?? 'http://notification-service:3006',
};

// ---------------------------------------------------------------
// Token de service interne
// Signé avec JWT_INTERNAL_SECRET (distinct du JWT utilisateur).
// Durée courte (5 min) pour limiter la fenêtre d'attaque.
// ---------------------------------------------------------------
import jwt from 'jsonwebtoken';

function generateInternalToken(): string {
  const secret = process.env.JWT_INTERNAL_SECRET ?? process.env.JWT_SECRET ?? 'change_me';
  return jwt.sign(
    { service: 'reporting-service', iat: Math.floor(Date.now() / 1000) },
    secret,
    { expiresIn: '5m' }
  );
}

const INTERNAL_HEADERS = {
  'Content-Type': 'application/json',
  'X-Internal-Service': 'reporting-service',
};

function getAuthHeaders(): Record<string, string> {
  return {
    ...INTERNAL_HEADERS,
    // Token de service interne signé — les autres services valident avec JWT_INTERNAL_SECRET
    'Authorization': `Bearer ${generateInternalToken()}`,
  };
}

// ---------------------------------------------------------------
// Client GET générique
// ---------------------------------------------------------------
async function get<T>(
  serviceKey: keyof typeof SERVICE_URLS,
  path: string
): Promise<T | null> {
  const url = `${SERVICE_URLS[serviceKey]}${path}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      console.warn(`[ServiceClient] ${serviceKey} ${path} → HTTP ${response.status}`);
      return null;
    }
    const json = await response.json() as { status: string; data?: T };
    return json.data ?? null;
  } catch (err) {
    console.error(`[ServiceClient] Erreur ${serviceKey} ${path}:`, (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------
// CORRECTION 1 : campus dynamiques depuis le campus-service
// Remplace le tableau d'UUIDs hardcodés dans kpi.service.ts
// ---------------------------------------------------------------

/**
 * Récupère dynamiquement la liste des campus actifs.
 * CORRIGÉ : plus d'UUIDs hardcodés — l'ajout d'un campus est automatiquement pris en compte.
 */
export async function fetchAllCampusIds(): Promise<string[]> {
  const result = await get<{
    campuses: Array<{ id: string; name: string; status: string }>
  }>('campus', '/api/campuses?status=active&limit=100');

  if (!result || !result.campuses) {
    console.warn('[ServiceClient] fetchAllCampusIds : aucun campus récupéré, fallback vide.');
    return [];
  }

  return result.campuses.map((c) => c.id);
}

/**
 * Récupère les métadonnées d'un campus (nom, capacité).
 */
export async function fetchCampusCapacity(campusId: string) {
  return get<{ id: string; capacityStudents: number; name: string }>(
    'campus',
    `/api/campuses/${campusId}`
  );
}

// ---------------------------------------------------------------
// CORRECTION 2 : stats financières depuis payment-service
// ---------------------------------------------------------------
export async function fetchPaymentStats(campusId: string, academicYear: number) {
  return get<{
    totalInvoiced: number;
    totalCollected: number;
    defaultRate: number;
    overdueRate: number;
  }>('payment', `/api/payments/stats?campusId=${campusId}&academicYear=${academicYear}`);
}

// ---------------------------------------------------------------
// CORRECTION 3 : stats étudiants depuis inscription-service
// ---------------------------------------------------------------
export async function fetchStudentStats(campusId: string) {
  return get<{
    total: number;
    active: number;
    suspended: number;
    graduated: number;
    withdrawn: number;
    paymentOverdue: number;
  }>('inscription', `/api/students/stats?campusId=${campusId}`);
}

// ---------------------------------------------------------------
// CORRECTION 4 : avgAttendanceRate et successRate RÉELS
// Appel vers le nouvel endpoint /api/stats/campus/:id
// (ajouté dans academic-service – voir corrections academic)
// ---------------------------------------------------------------
export async function fetchAcademicStats(campusId: string, academicYear: number) {
  const result = await get<{
    avgAttendanceRate: number;
    successRate: number;
    totalEnrollments: number;
    totalGraded: number;
  }>('academic', `/api/stats/campus/${campusId}?academicYear=${academicYear}`);

  if (!result) {
    console.warn(`[ServiceClient] fetchAcademicStats : données indisponibles pour campus ${campusId}`);
    return null;
  }

  return result;
}

// ---------------------------------------------------------------
// CORRECTION 5 : roomOccupancyRate RÉEL
// Appel vers le nouvel endpoint /api/stats/campus/:id/occupancy
// (ajouté dans planning-service – voir corrections planning)
// ---------------------------------------------------------------
export async function fetchRoomOccupancy(campusId: string, academicYear: number) {
  const result = await get<{
    totalSlots: number;
    occupiedSlots: number;
    occupancyRate: number;
  }>('planning', `/api/stats/campus/${campusId}/occupancy?academicYear=${academicYear}`);

  if (!result) {
    console.warn(`[ServiceClient] fetchRoomOccupancy : données indisponibles pour campus ${campusId}`);
    return null;
  }

  return result;
}

// ---------------------------------------------------------------
// Données étudiants pour l'agent IA
// ---------------------------------------------------------------
export async function fetchStudentEnrollments(studentId: string) {
  return get<Array<{
    id: string;
    courseId: string;
    finalGrade: number | null;
    attendanceRate: number | null;
    status: string;
    academicYear: number;
  }>>('academic', `/api/students/${studentId}/enrollments?limit=100`);
}

export async function fetchStudentInvoices(studentId: string) {
  return get<Array<{
    id: string;
    amount: number;
    status: string;
    dueDate: string;
  }>>('payment', `/api/invoices?studentId=${studentId}&limit=20`);
}

export async function fetchStudentAbsences(studentId: string) {
  return get<Array<{
    id: string;
    type: string;
    sessionDate: string;
  }>>('academic', `/api/students/${studentId}/absences`);
}

export async function fetchActiveStudents(campusId?: string, page = 1, limit = 50) {
  const params = new URLSearchParams({
    status: 'active',
    page: String(page),
    limit: String(limit),
  });
  if (campusId) params.set('campusId', campusId);

  return get<{
    students: Array<{ id: string; userId: string; programId: string; campusId: string }>;
    meta: { total: number; totalPages: number };
  }>('inscription', `/api/students?${params.toString()}`);
}

// ---------------------------------------------------------------
// CORRECTION 6 : broadcast notifications — authentification réelle
// AVANT : 'X-Bypass-Role': 'internal' → ignoré, 403 silencieux
// APRÈS : token de service signé avec JWT_INTERNAL_SECRET
// ---------------------------------------------------------------
export async function sendAiAlertNotification(payload: {
  userIds: string[];
  title: string;
  body: string;
  refType: string;
  refId: string;
}): Promise<void> {
  const url = `${SERVICE_URLS.notification}/api/notifications/internal/broadcast`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(), // token de service signé
      body: JSON.stringify({
        ...payload,
        type: 'ai_alert',
        channels: ['websocket', 'push'],
      }),
    });

    if (!response.ok) {
      console.warn(`[ServiceClient] sendAiAlertNotification → HTTP ${response.status}`);
    } else {
      console.log(`[ServiceClient] Notification broadcast envoyée à ${payload.userIds.length} utilisateur(s)`);
    }
  } catch (err) {
    // Non bloquant : l'alerte est persistée en base même si la notif échoue
    console.warn('[ServiceClient] Notification broadcast indisponible:', (err as Error).message);
  }
}
