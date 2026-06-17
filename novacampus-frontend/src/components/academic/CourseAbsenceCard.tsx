'use client'

// ============================================================
// src/components/academic/CourseAbsenceCard.tsx
// Carte d'absences pour un cours :
//   – Barre de progression du taux d'assiduité (colorée selon seuil)
//   – Compteurs rapides (absent / retard / justifié)
//   – Détail dépliable : liste chronologique des séances
// ============================================================

import { useState } from 'react'
import { FiChevronDown, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'
import clsx from 'clsx'
import type { CourseAbsenceSummary } from '../../types/absences'
import { ABSENCE_META } from '../../types/absences'

interface Props {
  summary: CourseAbsenceSummary
}

function AttendanceBar({ rate }: { rate: number }) {
  const isGood    = rate >= 90
  const isOk      = rate >= 75
  const isWarning = rate >= 50 && rate < 75
  const isCritical = rate < 50

  const barColor = isGood
    ? 'bg-nc-success'
    : isOk
    ? 'bg-nc-cyan'
    : isWarning
    ? 'bg-amber-400'
    : 'bg-red-500'

  const textColor = isGood
    ? 'text-nc-success'
    : isOk
    ? 'text-[#006d87]'
    : isWarning
    ? 'text-amber-600'
    : 'text-red-600'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className={clsx('text-xs font-semibold tabular-nums w-10 text-right', textColor)}>
        {rate.toFixed(0)}%
      </span>
    </div>
  )
}

export default function CourseAbsenceCard({ summary }: Props) {
  const [open, setOpen] = useState(false)

  const {
    courseName, courseCode, semester, academicYear,
    attendanceRate, absences, absentCount, lateCount, justifiedCount, total,
  } = summary

  const hasRisk = attendanceRate !== null && attendanceRate < 75
  const isClean = total === 0

  // Trier les absences par date décroissante
  const sorted = [...absences].sort(
    (a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
  )

  return (
    <div className={clsx(
      'rounded-xl border bg-white shadow-sm overflow-hidden',
      hasRisk ? 'border-amber-200' : 'border-gray-100'
    )}>

      {/* En-tête cliquable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition"
      >
        {/* Icône statut */}
        <div className={clsx(
          'mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isClean    ? 'bg-nc-success/10' :
          hasRisk    ? 'bg-amber-50'      :
                       'bg-gray-50'
        )}>
          {isClean ? (
            <FiCheckCircle size={14} className="text-nc-success" />
          ) : hasRisk ? (
            <FiAlertTriangle size={14} className="text-amber-500" />
          ) : (
            <span className="text-xs font-bold text-gray-400">{total}</span>
          )}
        </div>

        {/* Infos cours */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-semibold text-nc-navy leading-tight">{courseName}</p>
            {courseCode && (
              <span className="text-xs text-gray-400 font-mono mt-px">{courseCode}</span>
            )}
          </div>

          <p className="text-[11px] text-gray-400">
            Semestre {semester} · {academicYear}–{academicYear + 1}
          </p>

          {/* Barre assiduité */}
          {attendanceRate !== null ? (
            <AttendanceBar rate={attendanceRate} />
          ) : (
            <p className="text-[11px] text-gray-300 italic">Taux non calculé</p>
          )}

          {/* Compteurs rapides */}
          {total > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {absentCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {absentCount} absent{absentCount > 1 ? 's' : ''}
                </span>
              )}
              {lateCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {lateCount} retard{lateCount > 1 ? 's' : ''}
                </span>
              )}
              {justifiedCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-nc-success/10 text-nc-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-nc-success" />
                  {justifiedCount} justifié{justifiedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Flèche dépliable */}
        {total > 0 && (
          <FiChevronDown
            size={16}
            className={clsx('mt-1 text-gray-400 transition-transform flex-shrink-0', open && 'rotate-180')}
          />
        )}
      </button>

      {/* Détail des absences */}
      {open && total > 0 && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {sorted.map((abs) => {
            const meta = ABSENCE_META[abs.type]
            const date = new Date(abs.sessionDate).toLocaleDateString('fr-FR', {
              weekday: 'short', day: 'numeric', month: 'long',
            })

            return (
              <div key={abs.id} className="flex items-start gap-3 px-4 py-3">
                {/* Dot couleur */}
                <span className={clsx('mt-1.5 w-2 h-2 rounded-full flex-shrink-0', meta.dot)} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-800 capitalize">{date}</p>
                    <span className={clsx(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full',
                      meta.bg, meta.text
                    )}>
                      {meta.label}
                    </span>
                  </div>
                  {abs.justification && (
                    <p className="mt-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-2">
                      {abs.justification}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Message si aucune absence */}
      {open && isClean && (
        <div className="border-t border-gray-50 px-4 py-5 text-center">
          <p className="text-sm text-nc-success font-medium">Aucune absence enregistrée 🎉</p>
          <p className="text-xs text-gray-400 mt-0.5">Assiduité parfaite pour ce cours</p>
        </div>
      )}
    </div>
  )
}
