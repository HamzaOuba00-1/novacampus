'use client'

// ============================================================
// src/hooks/useGrades.ts
// Charge les inscriptions de l'étudiant, puis pour chacune
// ses notes + le détail du cours. Filtrable par semestre.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import {
  getMyEnrollments,
  getGradesForEnrollment,
  getCourseById,
  computeAverage,
} from '@/services/grades.service'
import type { CourseGrades, Enrollment } from '@/types/grades'

export function useGrades() {
  const [courses, setCourses]   = useState<CourseGrades[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [semesterFilter, setSemesterFilter] = useState<number | 'all'>('all')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const enrollments = await getMyEnrollments()

      const results: CourseGrades[] = await Promise.all(
        enrollments.map(async (enrollment: Enrollment) => {
          const [grades, course] = await Promise.all([
            getGradesForEnrollment(enrollment.id),
            getCourseById(enrollment.courseId),
          ])
          return { enrollment, course, grades }
        })
      )

      setCourses(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredCourses = courses.filter((c) =>
    semesterFilter === 'all' ? true : c.enrollment.semester === semesterFilter
  )

  const availableSemesters = Array.from(
    new Set(courses.map((c) => c.enrollment.semester))
  ).sort()

  const overallAverage = (() => {
    const withGrade = filteredCourses
      .map((c) => ({
        value: c.enrollment.finalGrade !== null
          ? parseFloat(c.enrollment.finalGrade)
          : computeAverage(c.grades),
        credits: c.course?.credits ?? 1,
      }))
      .filter((c): c is { value: number; credits: number } => c.value !== null)

    if (withGrade.length === 0) return null

    const totalCredits = withGrade.reduce((acc, c) => acc + c.credits, 0)
    const weightedSum  = withGrade.reduce((acc, c) => acc + c.value * c.credits, 0)
    return totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : null
  })()

  return {
    courses: filteredCourses,
    allCourses: courses,
    availableSemesters,
    semesterFilter,
    setSemesterFilter,
    overallAverage,
    isLoading,
    error,
    refetch: load,
  }
}
