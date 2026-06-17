'use client'

// ============================================================
// src/hooks/useAbsences.ts
// Charge les absences de l'étudiant + les enrichit avec les
// données de cours (depuis useGrades déjà chargé en parallèle).
//
// Stratégie :
//   1. Récupérer les enrollments (déjà disponibles via grades.service)
//   2. Récupérer toutes les absences via absences.service
//   3. Croiser : regrouper les absences par enrollmentId
//   4. Exposer un résumé par cours + filtre semestre
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getMyAbsences } from '@/services/absences.service'
import { getMyEnrollments, getCourseById } from '@/services/grades.service'
import type { CourseAbsenceSummary } from '@/types/absences'
import type { Enrollment } from '@/types/grades'

export function useAbsences() {
  const { user } = useAuth()

  const [summaries, setSummaries]     = useState<CourseAbsenceSummary[]>([])
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [semesterFilter, setSemesterFilter] = useState<number | 'all'>('all')

  const load = useCallback(async () => {
    if (!user?.id) return
    setIsLoading(true)
    setError(null)

    try {
      // Charger enrollments + absences en parallèle
      const [enrollments, absences] = await Promise.all([
        getMyEnrollments(),
        getMyAbsences(user.id),
      ])

      // Charger les détails de chaque cours
      const courses = await Promise.all(
        enrollments.map((e: Enrollment) => getCourseById(e.courseId))
      )

      // Construire un map enrollmentId → index
      const enrollmentMap = new Map<string, { enrollment: Enrollment; courseIdx: number }>(
        enrollments.map((e: Enrollment, i: number) => [e.id, { enrollment: e, courseIdx: i }])
      )

      // Regrouper les absences par enrollmentId
      const grouped = new Map<string, typeof absences>()
      for (const abs of absences) {
        const existing = grouped.get(abs.enrollmentId) ?? []
        existing.push(abs)
        grouped.set(abs.enrollmentId, existing)
      }

      // Construire les résumés par cours
      const result: CourseAbsenceSummary[] = enrollments.map((e: Enrollment, i: number) => {
        const course  = courses[i]
        const absList = grouped.get(e.id) ?? []

        return {
          enrollmentId:   e.id,
          courseId:       e.courseId,
          courseCode:     course?.code  ?? 'N/A',
          courseName:     course?.name  ?? 'Cours inconnu',
          semester:       e.semester,
          academicYear:   e.academicYear,
          attendanceRate: e.attendanceRate !== null ? parseFloat(e.attendanceRate) : null,
          absences:       absList,
          absentCount:    absList.filter((a) => a.type === 'absent').length,
          lateCount:      absList.filter((a) => a.type === 'late').length,
          justifiedCount: absList.filter((a) => a.type === 'justified').length,
          total:          absList.length,
        }
      })

      // Trier : d'abord les cours avec absences non justifiées
      result.sort((a, b) => {
        const aRisk = a.absentCount + a.lateCount
        const bRisk = b.absentCount + b.lateCount
        return bRisk - aRisk
      })

      setSummaries(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const filteredSummaries = summaries.filter((s) =>
    semesterFilter === 'all' ? true : s.semester === semesterFilter
  )

  const availableSemesters = Array.from(
    new Set(summaries.map((s) => s.semester))
  ).sort()

  // Statistiques globales (filtrées)
  const globalStats = filteredSummaries.reduce(
    (acc, s) => ({
      totalAbsent:    acc.totalAbsent    + s.absentCount,
      totalLate:      acc.totalLate      + s.lateCount,
      totalJustified: acc.totalJustified + s.justifiedCount,
    }),
    { totalAbsent: 0, totalLate: 0, totalJustified: 0 }
  )

  // Cours avec taux d'assiduité critique (< 75%)
  const atRiskCourses = filteredSummaries.filter(
    (s) => s.attendanceRate !== null && s.attendanceRate < 75
  ).length

  return {
    summaries: filteredSummaries,
    allSummaries: summaries,
    availableSemesters,
    semesterFilter,
    setSemesterFilter,
    globalStats,
    atRiskCourses,
    isLoading,
    error,
    refetch: load,
  }
}
