'use client'

// ============================================================
// src/app/academic/absences/page.tsx
// Page Absences étudiant
//   – Bandeau d'alerte si cours en dessous du seuil (75%)
//   – Statistiques globales (absent / retard / justifié)
//   – Filtre par semestre
//   – Liste des cours avec jauge d'assiduité + détail dépliable
//
// APIs :
//   GET /api/academic/students/:id/absences
//   GET /api/academic/students/me/enrollments   (déjà utilisé dans grades)
//   GET /api/courses/:id                        (déjà utilisé dans grades)
// ============================================================

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAbsences } from '@/hooks/useAbsences'
import AppShell from '@/components/layout/AppShell'
import CourseAbsenceCard from '@/components/academic/CourseAbsenceCard'
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiInbox,
} from 'react-icons/fi'
import clsx from 'clsx'

export default function AbsencesPage() {
  const { isLoading: authLoading } = useRequireAuth()
  const {
    summaries,
    availableSemesters,
    semesterFilter,
    setSemesterFilter,
    globalStats,
    atRiskCourses,
    isLoading,
    error,
  } = useAbsences()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nc-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nc-cyan border-t-transparent" />
      </div>
    )
  }

  const totalIssues = globalStats.totalAbsent + globalStats.totalLate

  return (
    <AppShell>
      <div className="space-y-4">

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Mes absences</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              {summaries.length} cours
              {semesterFilter !== 'all' ? ` · Semestre ${semesterFilter}` : ''}
            </p>
          </div>

          {/* Résumé global */}
          {!isLoading && (
            <div className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 shadow-sm px-4 py-2.5">
              <div className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0',
                totalIssues === 0 ? 'bg-nc-success/10' : 'bg-amber-50'
              )}>
                {totalIssues === 0 ? (
                  <FiCheckCircle size={16} className="text-nc-success" />
                ) : (
                  <FiAlertTriangle size={16} className="text-amber-500" />
                )}
              </div>
              <div>
                <p className="text-[11px] text-gray-400 leading-none">
                  {totalIssues === 0 ? 'Aucune absence' : 'Total absences'}
                </p>
                {totalIssues > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    {globalStats.totalAbsent > 0 && (
                      <span className="text-xs font-semibold text-red-600">
                        {globalStats.totalAbsent} abs.
                      </span>
                    )}
                    {globalStats.totalLate > 0 && (
                      <span className="text-xs font-semibold text-amber-600">
                        {globalStats.totalLate} ret.
                      </span>
                    )}
                    {globalStats.totalJustified > 0 && (
                      <span className="text-xs font-semibold text-nc-success">
                        {globalStats.totalJustified} just.
                      </span>
                    )}
                  </div>
                )}
                {totalIssues === 0 && (
                  <p className="mt-0.5 text-xs font-medium text-nc-success">Assiduité parfaite</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alerte cours à risque */}
        {!isLoading && atRiskCourses > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <FiAlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700">
                {atRiskCourses} cours en dessous du seuil d&apos;assiduité
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Un taux d&apos;assiduité inférieur à 75% peut entraîner des sanctions académiques.
                Contactez votre administration si nécessaire.
              </p>
            </div>
          </div>
        )}

        {/* Filtre semestres */}
        {availableSemesters.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
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
              <div key={i} className="h-24 bg-white border border-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : summaries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-100">
            <FiInbox size={40} className="text-gray-200 mb-4" />
            <p className="text-sm font-medium text-gray-400">Aucune inscription trouvée</p>
            <p className="mt-1 text-xs text-gray-300">
              Vos absences apparaîtront ici une fois inscrit à vos cours.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {summaries.map((s) => (
              <CourseAbsenceCard key={s.enrollmentId} summary={s} />
            ))}
          </div>
        )}

      </div>
    </AppShell>
  )
}
