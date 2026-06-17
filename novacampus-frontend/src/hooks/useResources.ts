'use client'

// ============================================================
// src/hooks/useResources.ts
// Charge les ressources pédagogiques de tous les cours
// auxquels l'étudiant est inscrit.
//
// Stratégie :
//   1. Récupérer les enrollments (grades.service – déjà utilisé)
//   2. Récupérer le détail de chaque cours (grades.service)
//   3. Récupérer les ressources de chaque cours (resources.service)
//   4. Grouper par cours + filtres (semestre, type, recherche)
// ============================================================

import { useState, useEffect, useCallback, useMemo } from 'react'
import { getMyEnrollments, getCourseById } from '@/services/grades.service'
import { getResourcesByCourse } from '../services/resources.service'
import type { CourseWithResources, ResourceType } from '../types/resources'
import type { Enrollment } from '@/types/grades'

export function useResources() {
  const [courseGroups, setCourseGroups]   = useState<CourseWithResources[]>([])
  const [isLoading, setIsLoading]         = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [semesterFilter, setSemesterFilter] = useState<number | 'all'>('all')
  const [typeFilter, setTypeFilter]       = useState<ResourceType | 'all'>('all')
  const [search, setSearch]               = useState('')

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const enrollments = await getMyEnrollments()

      // Charger cours + ressources en parallèle pour chaque inscription
      const groups = await Promise.all(
        enrollments.map(async (e: Enrollment) => {
          const [course, resources] = await Promise.all([
            getCourseById(e.courseId),
            getResourcesByCourse(e.courseId),
          ])
          return {
            courseId:   e.courseId,
            courseCode: course?.code  ?? 'N/A',
            courseName: course?.name  ?? 'Cours inconnu',
            semester:   e.semester,
            resources,
          } satisfies CourseWithResources
        })
      )

      // Ne garder que les cours qui ont au moins une ressource visible
      // (ou tous les cours pour afficher l'état vide par cours)
      setCourseGroups(groups)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filtres appliqués ──────────────────────────────────────
  const filtered = useMemo(() => {
    return courseGroups
      .filter((g) => semesterFilter === 'all' || g.semester === semesterFilter)
      .map((g) => ({
        ...g,
        resources: g.resources.filter((r) => {
          const matchType   = typeFilter === 'all' || r.type === typeFilter
          const matchSearch = search.trim() === '' ||
            r.title.toLowerCase().includes(search.toLowerCase())
          return matchType && matchSearch
        }),
      }))
      // Garder uniquement les cours avec au moins une ressource après filtrage
      .filter((g) => g.resources.length > 0)
  }, [courseGroups, semesterFilter, typeFilter, search])

  const availableSemesters = useMemo(() =>
    Array.from(new Set(courseGroups.map((g) => g.semester))).sort(),
    [courseGroups]
  )

  const totalResources = useMemo(() =>
    filtered.reduce((acc, g) => acc + g.resources.length, 0),
    [filtered]
  )

  // Ressources sans filtres (pour les compteurs par type)
  const allResources = useMemo(() =>
    courseGroups.flatMap((g) => g.resources),
    [courseGroups]
  )

  return {
    courseGroups: filtered,
    allGroups: courseGroups,
    availableSemesters,
    semesterFilter, setSemesterFilter,
    typeFilter,     setTypeFilter,
    search,         setSearch,
    totalResources,
    allResources,
    isLoading,
    error,
    refetch: load,
  }
}
