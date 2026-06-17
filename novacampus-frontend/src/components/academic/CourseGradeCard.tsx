'use client'

// ============================================================
// src/components/academic/CourseGradeCard.tsx
// Carte d'un cours avec sa moyenne, son statut et le détail
// des notes (dépliable)
// ============================================================

import { useState } from 'react'
import { FiChevronDown, FiMessageSquare } from 'react-icons/fi'
import clsx from 'clsx'
import type { CourseGrades } from '@/types/grades'
import { computeAverage } from '@/services/grades.service'
import GradeBadge from './GradeBadge'

const STATUS_LABELS: Record<string, { label: string; classes: string }> = {
  enrolled:  { label: 'En cours',   classes: 'bg-nc-cyan/10 text-[#006d87]' },
  validated: { label: 'Validé',     classes: 'bg-nc-success/10 text-nc-success' },
  failed:    { label: 'Non validé', classes: 'bg-red-50 text-red-600' },
  withdrawn: { label: 'Abandonné',  classes: 'bg-gray-100 text-gray-400' },
}

export default function CourseGradeCard({ enrollment, course, grades }: CourseGrades) {
  const [open, setOpen] = useState(false)

  const average = enrollment.finalGrade !== null
    ? parseFloat(enrollment.finalGrade)
    : computeAverage(grades)

  const status = STATUS_LABELS[enrollment.status] ?? STATUS_LABELS.enrolled
  const courseName = course?.name ?? 'Cours inconnu'
  const courseCode = course?.code

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">

      {/* En-tête cliquable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
      >
        {/* Infos cours */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-nc-navy truncate">{courseName}</p>
            {courseCode && (
              <span className="text-xs text-gray-400 font-mono">{courseCode}</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', status.classes)}>
              {status.label}
            </span>
            {course?.credits && (
              <span className="text-[11px] text-gray-400">{course.credits} ECTS</span>
            )}
            <span className="text-[11px] text-gray-400">
              {grades.length} évaluation{grades.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Moyenne */}
        <div className="shrink-0 flex items-center gap-2">
          {average !== null ? (
            <GradeBadge value={average} size="md" />
          ) : (
            <span className="text-xs text-gray-300 italic">Pas de note</span>
          )}
          <FiChevronDown
            size={16}
            className={clsx('text-gray-400 transition-transform', open && 'rotate-180')}
          />
        </div>
      </button>

      {/* Détail des notes */}
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {grades.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-300 italic">
              Aucune note saisie pour ce cours
            </p>
          ) : (
            grades.map((g) => {
              const value  = parseFloat(g.value)
              const weight = parseFloat(g.weight)
              const date   = new Date(g.gradedAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', year: 'numeric',
              })

              return (
                <div key={g.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800">{g.label}</p>
                      {weight !== 1 && (
                        <span className="text-[11px] text-gray-400">coef. {weight}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">{date}</p>

                    {g.comment && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-2">
                        <FiMessageSquare size={12} className="mt-0.5 shrink-0 text-gray-400" />
                        <span>{g.comment}</span>
                      </div>
                    )}
                  </div>

                  <GradeBadge value={value} size="sm" />
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
