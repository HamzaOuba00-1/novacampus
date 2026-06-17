// ============================================================
// src/services/absences.service.ts
// Appels API academic-service pour les absences étudiant
//
// Routes utilisées :
//   GET /api/students/:id/absences
//     → academic-service répond { status, data: { absences } }
//     → filtrable par ?courseId=&academicYear=
//
// Le studentId dans l'URL est l'UUID du dossier inscription-service.
// Pour un étudiant connecté, on utilise 'me' mais le controller
// academic utilise req.user.id → on passe l'userId du JWT.
//
// Routing gateway : /api/students/* → inscription-service:3004
// SAUF si on préfixe par /api/academic/ comme pour les notes.
// On suit le même pattern que grades.service.ts
// ============================================================

import apiClient from '@/lib/apiClient'
import type { Absence } from '@/types/absences'

// ── GET /api/academic/students/:studentId/absences ───────────
// Le controller accepte le studentId en param + filtre optionnel
// courseId et academicYear en query.
// Pour un étudiant, studentId = user.id (UUID auth-service)
export const getMyAbsences = async (
  studentId: string,
  filters: { courseId?: string; academicYear?: number } = {}
): Promise<Absence[]> => {
  const { data } = await apiClient.get<{ status: string; data: { absences: Absence[] } }>(
    `/api/academic/students/${studentId}/absences`,
    { params: filters }
  )
  return data.data?.absences ?? []
}
