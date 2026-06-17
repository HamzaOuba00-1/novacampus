// ============================================================
// src/services/resources.service.ts
// Appels API academic-service pour les ressources pédagogiques
//
// Route backend : GET /api/courses/:courseId/resources
//   → academic-service:3002
//   → répond { status, data: { resources } }
//   → le controller filtre isVisible selon le rôle (étudiant → visible seulement)
//
// Gateway routing : /api/courses/* → academic-service:3002
// ============================================================

import apiClient from '@/lib/apiClient'
import type { CourseResource } from '../types/resources'

// ── GET /api/courses/:courseId/resources ─────────────────────
export const getResourcesByCourse = async (
  courseId: string
): Promise<CourseResource[]> => {
  const { data } = await apiClient.get<{
    status: string
    data: { resources: CourseResource[] }
  }>(`/api/courses/${courseId}/resources`)
  return data.data?.resources ?? []
}
