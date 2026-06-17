'use client'

// ============================================================
// src/components/instructor/SlotDetailInstructor.tsx
// Détail d'un créneau vu par un enseignant
//
// Différences vs SlotDetail étudiant :
//   – Affiche le nombre d'inscrits au cours
//   – Bouton « Saisir les absences » → ouvre le formulaire inline
//   – Formulaire batch : liste des étudiants inscrits, checkbox
//     absent/retard par étudiant, soumission POST /api/schedules/:id/absences
//   – Confirme la saisie avec un toast de succès
// ============================================================

import { useState, useEffect } from 'react'
import {
  FiX, FiMapPin, FiClock, FiBook, FiAlertTriangle,
  FiUsers, FiCheck, FiChevronDown, FiChevronUp,
} from 'react-icons/fi'
import clsx from 'clsx'
import type { ScheduleSlot } from '@/types/schedule'
import { formatTime, getDurationFromHHMM } from '@/hooks/useSchedule'
import apiClient from '@/lib/apiClient'

interface Props {
  slot: ScheduleSlot
  onClose: () => void
}

// ── Types locaux ──────────────────────────────────────────────
interface EnrolledStudent {
  id: string              // enrollmentId
  studentId: string
  name: string            // nom affiché (userId → à enrichir si inscription-service disponible)
}

type AbsenceType = 'absent' | 'late'
interface AbsenceEntry {
  enrollmentId: string
  type: AbsenceType
}

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// ── Fetch étudiants inscrits au cours ─────────────────────────
async function fetchEnrollments(courseId: string): Promise<EnrolledStudent[]> {
  try {
    const { data } = await apiClient.get<{
      status: string
      enrollments: Array<{ id: string; studentId: string; status: string }>
    }>(`/api/enrollments?courseId=${courseId}&status=enrolled&limit=100`)

    return (data.enrollments ?? [])
      .filter((e) => e.status === 'enrolled')
      .map((e) => ({
        id: e.id,
        studentId: e.studentId,
        // Le nom réel viendrait d'inscription-service ; UUID court en attendant
        name: `Étudiant ${e.studentId.slice(0, 8)}`,
      }))
  } catch {
    return []
  }
}

// ── Composant principal ────────────────────────────────────────
export default function SlotDetailInstructor({ slot, onClose }: Props) {
  const duration = getDurationFromHHMM(slot.startTime, slot.endTime)
  const hours    = Math.floor(duration / 60)
  const mins     = duration % 60

  const isCancelled  = slot.exception?.type === 'cancelled'
  const isRoomChange = slot.exception?.type === 'room_change'
  const isTimeChange = slot.exception?.type === 'time_change'

  const displayRoom = isRoomChange && slot.exception?.newRoom
    ? slot.exception.newRoom
    : slot.room.name || slot.room.code

  // ── State ─────────────────────────────────────────────────
  const [absenceOpen, setAbsenceOpen]       = useState(false)
  const [students, setStudents]             = useState<EnrolledStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [entries, setEntries]               = useState<Record<string, AbsenceType | null>>({})
  const [sessionDate, setSessionDate]       = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [submitting, setSubmitting]         = useState(false)
  const [success, setSuccess]               = useState(false)
  const [submitError, setSubmitError]       = useState<string | null>(null)

  // Charger les inscrits quand on ouvre le formulaire
  useEffect(() => {
    if (!absenceOpen || students.length > 0) return
    setStudentsLoading(true)
    fetchEnrollments(slot.courseId)
      .then(setStudents)
      .finally(() => setStudentsLoading(false))
  }, [absenceOpen, slot.courseId, students.length])

  // Toggle absent/retard/aucun pour un étudiant
  function toggleEntry(enrollmentId: string, type: AbsenceType) {
    setEntries((prev) => {
      const current = prev[enrollmentId]
      return { ...prev, [enrollmentId]: current === type ? null : type }
    })
  }

  // Soumettre la saisie
  async function handleSubmit() {
    const absences = Object.entries(entries)
      .filter(([, type]) => type !== null)
      .map(([enrollmentId, type]) => ({ enrollmentId, type }))

    if (absences.length === 0) {
      setSubmitError('Aucune absence à enregistrer.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      await apiClient.post(`/api/schedules/${slot.scheduleId}/absences`, {
        sessionDate,
        absences,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      setEntries({})
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la saisie.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const markedCount = Object.values(entries).filter(Boolean).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto lg:left-auto lg:right-6 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2 lg:w-96 lg:rounded-2xl lg:max-h-[85vh]">

        {/* Header */}
        <div className="sticky top-0 bg-white flex items-start justify-between p-5 border-b border-gray-100 z-10">
          <div className="min-w-0 pr-3">
            {slot.courseCode && (
              <p className="text-xs font-semibold uppercase tracking-wide text-nc-cyan mb-1">
                {slot.courseCode}
              </p>
            )}
            <h3 className="text-base font-semibold text-nc-navy leading-tight">
              {slot.courseName || 'Cours'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Infos créneau */}
          <p className="text-sm font-medium text-gray-500">
            {DAY_LABELS[slot.dayOfWeek]} · S{slot.semester} {slot.academicYear}-{slot.academicYear + 1}
          </p>

          <div className="flex items-center gap-3 text-sm">
            <FiClock size={15} className="text-nc-cyan shrink-0" />
            <span className="font-medium text-gray-800">
              {isTimeChange && slot.exception?.newStartTime
                ? `${slot.exception.newStartTime} – ${slot.exception.newEndTime}`
                : `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}`
              }
            </span>
            <span className="text-gray-400 text-xs">
              ({hours > 0 ? `${hours}h` : ''}{mins > 0 ? `${mins}min` : ''})
            </span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <FiMapPin size={15} className="text-nc-cyan shrink-0" />
            <div>
              <span className="text-gray-700">{displayRoom}</span>
              {slot.room.building && (
                <span className="ml-1.5 text-xs text-gray-400">{slot.room.building}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <FiBook size={15} className="text-nc-cyan shrink-0" />
            <span className="text-gray-500">Cours récurrent (hebdomadaire)</span>
          </div>

          {/* Exception */}
          {slot.exception && !isCancelled && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <FiAlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">
                    {isRoomChange ? 'Changement de salle' : 'Horaire modifié'}
                  </p>
                  {slot.exception.reason && (
                    <p className="mt-0.5 text-xs text-amber-700">{slot.exception.reason}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <FiAlertTriangle size={14} className="mt-0.5 shrink-0" />
                <p className="font-medium">Cours annulé</p>
              </div>
            </div>
          )}

          {/* Séparateur */}
          <div className="border-t border-gray-100 pt-2" />

          {/* Bouton saisie absences */}
          {!isCancelled && (
            <button
              onClick={() => setAbsenceOpen((v) => !v)}
              className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition"
            >
              <span className="flex items-center gap-2">
                <FiUsers size={15} className="text-nc-cyan" />
                Saisir les absences
              </span>
              {absenceOpen
                ? <FiChevronUp size={15} className="text-gray-400" />
                : <FiChevronDown size={15} className="text-gray-400" />
              }
            </button>
          )}

          {/* Formulaire absences */}
          {absenceOpen && !isCancelled && (
            <div className="space-y-4">

              {/* Date de séance */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Date de la séance
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-nc-cyan focus:outline-none focus:ring-1 focus:ring-nc-cyan/30"
                />
              </div>

              {/* Liste étudiants */}
              {studentsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-11 rounded-lg bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : students.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">
                  Aucun étudiant inscrit à ce cours.
                </p>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400 mb-2">
                    {students.length} étudiant{students.length > 1 ? 's' : ''} inscrit{students.length > 1 ? 's' : ''}
                    {markedCount > 0 && ` · ${markedCount} marqué${markedCount > 1 ? 's' : ''}`}
                  </p>

                  {students.map((s) => {
                    const current = entries[s.id] ?? null
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2.5"
                      >
                        {/* Avatar initiales */}
                        <div className="w-7 h-7 rounded-full bg-nc-cyan/10 flex items-center justify-center text-[10px] font-bold text-nc-cyan flex-shrink-0">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Nom */}
                        <span className="flex-1 text-sm text-gray-700 truncate">{s.name}</span>

                        {/* Boutons absent / retard */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => toggleEntry(s.id, 'absent')}
                            className={clsx(
                              'rounded-md px-2 py-0.5 text-[11px] font-medium transition border',
                              current === 'absent'
                                ? 'bg-red-500 text-white border-red-500'
                                : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500'
                            )}
                          >
                            Abs
                          </button>
                          <button
                            onClick={() => toggleEntry(s.id, 'late')}
                            className={clsx(
                              'rounded-md px-2 py-0.5 text-[11px] font-medium transition border',
                              current === 'late'
                                ? 'bg-amber-400 text-white border-amber-400'
                                : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-500'
                            )}
                          >
                            Ret
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Succès */}
              {success && (
                <div className="flex items-center gap-2 rounded-lg bg-nc-success/10 border border-nc-success/30 px-4 py-3 text-sm text-nc-success font-medium">
                  <FiCheck size={15} />
                  Absences enregistrées avec succès
                </div>
              )}

              {/* Erreur soumission */}
              {submitError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  ⚠ {submitError}
                </div>
              )}

              {/* Bouton soumettre */}
              {students.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || markedCount === 0}
                  className={clsx(
                    'w-full rounded-xl py-3 text-sm font-semibold transition',
                    markedCount > 0 && !submitting
                      ? 'bg-nc-navy text-white hover:bg-nc-navymd'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {submitting
                    ? 'Enregistrement…'
                    : markedCount > 0
                    ? `Enregistrer ${markedCount} absence${markedCount > 1 ? 's' : ''}`
                    : 'Sélectionnez des étudiants'
                  }
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
