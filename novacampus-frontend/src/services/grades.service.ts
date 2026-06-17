// ============================================================
// src/services/grades.service.ts
// Appels API academic-service pour les notes étudiant
//
// IMPORTANT ROUTAGE GATEWAY :
//   GET /api/students/:id/enrollments est défini dans
//   l'academic-service, mais le gateway route /api/students/*
//   vers inscription-service:3004. Une route nginx dédiée
//   /api/academic/students/ → academic-service est nécessaire.
// ============================================================

import apiClient from '@/lib/apiClient'
import type { ApiResponse } from '@/types'
import type { Enrollment, Grade, Course } from '@/types/grades'

// ── GET /api/academic/students/me/enrollments ────────────────
// Le controller ignore le param :studentId pour un étudiant
// (utilise req.user.id), donc 'me' est un placeholder valide
//
// IMPORTANT : le controller renvoie { status, enrollments, meta }
// — "enrollments" est à la RACINE de la réponse, pas dans "data"
// (pattern res.json({ status: 'success', ...result }) avec
// result = { enrollments, meta }).
export const getMyEnrollments = async (
  filters: { academicYear?: number; semester?: number } = {}
): Promise<Enrollment[]> => {
  const { data } = await apiClient.get<{ status: string; enrollments: Enrollment[] }>(
    '/api/academic/students/me/enrollments',
    { params: filters }
  )
  return data.enrollments ?? []
}

// ── GET /api/enrollments/:enrollmentId/grades ────────────────
// Même pattern : { status, grades, meta } à la racine
export const getGradesForEnrollment = async (enrollmentId: string): Promise<Grade[]> => {
  const { data } = await apiClient.get<{ status: string; grades: Grade[] }>(
    `/api/enrollments/${enrollmentId}/grades`
  )
  return data.grades ?? []
}

// ── GET /api/courses/:id ──────────────────────────────────────
// Pattern différent : { status, data: {...} }
export const getCourseById = async (courseId: string): Promise<Course | null> => {
  try {
    const { data } = await apiClient.get<ApiResponse<Course>>(`/api/courses/${courseId}`)
    return data.data ?? null
  } catch {
    return null
  }
}

// ── Moyenne pondérée locale (cohérent avec recalculateFinalGrade) ─
export function computeAverage(grades: Grade[]): number | null {
  if (grades.length === 0) return null
  let totalWeight = 0
  let weightedSum = 0
  for (const g of grades) {
    const v = parseFloat(g.value)
    const w = parseFloat(g.weight)
    totalWeight += w
    weightedSum += v * w
  }
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : null
}