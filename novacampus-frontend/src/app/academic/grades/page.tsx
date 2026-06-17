'use client'

// ============================================================
// src/app/academic/grades/page.tsx
// Page Notes étudiant
//   – Moyenne générale en en-tête
//   – Filtre par semestre
//   – Liste des cours avec moyenne + détail dépliable
// APIs : GET /api/academic/students/me/enrollments
//        GET /api/enrollments/:id/grades
//        GET /api/courses/:id
// ============================================================

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useGrades } from '@/hooks/useGrades'
import AppShell from '@/components/layout/AppShell'
import CourseGradeCard from '@/components/academic/CourseGradeCard'
import GradeBadge from '@/components/academic/GradeBadge'
import { FiAward, FiInbox } from 'react-icons/fi'
import clsx from 'clsx'

export default function GradesPage() {
  const { isLoading: authLoading } = useRequireAuth()
  const {
    courses,
    availableSemesters,
    semesterFilter,
    setSemesterFilter,
    overallAverage,
    isLoading,
    error,
  } = useGrades()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nc-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nc-cyan border-t-transparent" />
      </div>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mes notes</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {courses.length} cours{semesterFilter !== 'all' ? ` · Semestre ${semesterFilter}` : ''}
            </p>
          </div>

          {/* Moyenne générale */}
          {overallAverage !== null && (
            <div className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-nc-cyan/10">
                <FiAward size={16} className="text-nc-cyan" />
              </div>
              <div>
                <p className="text-[11px] text-gray-400 leading-none">Moyenne générale</p>
                <div className="mt-1">
                  <GradeBadge value={overallAverage} size="lg" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filtre semestres */}
        {availableSemesters.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSemesterFilter('all')}
              className={clsx(
                'rounded-full px-3 py-1.5 text-xs font-medium transition',
                semesterFilter === 'all'
                  ? 'bg-nc-navy text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              Tous
            </button>
            {availableSemesters.map((sem) => (
              <button
                key={sem}
                onClick={() => setSemesterFilter(sem)}
                className={clsx(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition',
                  semesterFilter === sem
                    ? 'bg-nc-navy text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                Semestre {sem}
              </button>
            ))}
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠ {error}
          </div>
        )}

        {/* Skeleton */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-white border border-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-100">
            <FiInbox size={40} className="text-gray-200 mb-4" />
            <p className="text-sm font-medium text-gray-400">Aucune inscription trouvée</p>
            <p className="mt-1 text-xs text-gray-300">
              Vos cours et notes apparaîtront ici une fois inscrit.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((c) => (
              <CourseGradeCard key={c.enrollment.id} {...c} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
