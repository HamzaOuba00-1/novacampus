'use client'

// ============================================================
// src/app/instructor/schedules/page.tsx
// Emploi du temps – vue enseignant
//
// Différences vs la page étudiant (/academic/schedules) :
//   – Rôle requis : 'instructor' uniquement
//   – Clic sur créneau → SlotDetailInstructor
//     (contient la liste des inscrits + saisie d'absences batch)
//   – Badge "Enseignant" dans l'en-tête
//
// Réutilise exactement les mêmes composants et le même hook :
//   – useSchedule    → GET /api/planning/schedules/me
//   – WeekView       → grille desktop
//   – DayList        → liste mobile
//   – La gateway NGINX route /api/planning/* → planning-service:3003
// ============================================================

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useSchedule } from '@/hooks/useSchedule'
import AppShell from '@/components/layout/AppShell'
import WeekView from '@/components/academic/WeekView'
import DayList from '@/components/academic/DayList'
import SlotDetailInstructor from '@/components/instructor/SlotDetailInstructor'
import { FiChevronLeft, FiChevronRight, FiCalendar, FiUsers } from 'react-icons/fi'

export default function InstructorSchedulesPage() {
  const { isLoading: authLoading } = useRequireAuth({ allowedRoles: ['instructor'] })

  const {
    weekDays,
    weekLabel,
    academicYear,
    isLoading,
    error,
    isCurrentWeek,
    selectedSlot,
    setSelectedSlot,
    goToPrevWeek,
    goToNextWeek,
    goToToday,
  } = useSchedule()

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nc-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nc-cyan border-t-transparent" />
      </div>
    )
  }

  // Compte le total de cours sur la semaine affichée
  const totalSlots = weekDays.reduce((acc, d) => acc + d.slots.length, 0)

  return (
    <AppShell>
      <div className="space-y-4">

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-xl font-semibold text-gray-900">Mon planning</h2>
              {/* Badge rôle enseignant */}
              <span className="inline-flex items-center gap-1 rounded-full bg-nc-purple/10 px-2 py-0.5 text-[11px] font-medium text-nc-purple">
                <FiUsers size={10} />
                Enseignant
              </span>
            </div>
            <p className="text-xs text-gray-400">
              {academicYear
                ? `Année ${academicYear.year.label}${academicYear.currentSemester?.semester ? ` · Semestre ${academicYear.currentSemester.semester}` : ''}`
                : 'Chargement…'
              }
              {!isLoading && totalSlots > 0 && (
                <span className="ml-2 text-gray-300">
                  · {totalSlots} séance{totalSlots > 1 ? 's' : ''} cette semaine
                </span>
              )}
            </p>
          </div>

          {/* Navigation semaine */}
          <div className="flex items-center gap-2">
            {!isCurrentWeek && (
              <button
                onClick={goToToday}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                <FiCalendar size={13} />
                Aujourd&apos;hui
              </button>
            )}

            <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={goToPrevWeek}
                className="flex h-8 w-8 items-center justify-center text-gray-500 hover:bg-gray-50 transition"
                aria-label="Semaine précédente"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="px-3 text-xs font-medium text-gray-700 whitespace-nowrap border-x border-gray-200">
                {weekLabel}
              </span>
              <button
                onClick={goToNextWeek}
                className="flex h-8 w-8 items-center justify-center text-gray-500 hover:bg-gray-50 transition"
                aria-label="Semaine suivante"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Erreur */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠ {error}
          </div>
        )}

        {/* Skeleton */}
        {isLoading ? (
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden p-4 lg:p-5">

            {isCurrentWeek && (
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-nc-cyan/10 px-3 py-1 text-xs font-medium text-nc-cyan">
                <span className="h-1.5 w-1.5 rounded-full bg-nc-cyan animate-pulse" />
                Semaine en cours
              </div>
            )}

            {/* Indice cliquabilité */}
            {totalSlots > 0 && (
              <p className="mb-3 text-xs text-gray-400">
                Cliquez sur un créneau pour voir le détail et saisir les absences
              </p>
            )}

            {/* Desktop : grille semaine */}
            <WeekView weekDays={weekDays} onSlotClick={setSelectedSlot} />

            {/* Mobile : liste par jour */}
            <DayList weekDays={weekDays} onSlotClick={setSelectedSlot} />

            {/* Aucun cours */}
            {totalSlots === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FiCalendar size={40} className="text-gray-200 mb-4" />
                <p className="text-sm font-medium text-gray-400">Aucun cours cette semaine</p>
                <p className="mt-1 text-xs text-gray-300">
                  Naviguez vers une autre semaine ou contactez l&apos;administration.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer détail créneau – version enseignant avec saisie absences */}
      {selectedSlot && (
        <SlotDetailInstructor
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </AppShell>
  )
}
