'use client'

// ============================================================
// src/components/academic/SlotDetail.tsx
// Détail d'un créneau – drawer mobile / panel desktop
// Adapté : startTime/endTime sont "HH:MM", room est un objet
// ============================================================

import { FiX, FiMapPin, FiUser, FiClock, FiBook, FiAlertTriangle } from 'react-icons/fi'
import type { ScheduleSlot } from '@/types/schedule'
import { formatTime, getDurationFromHHMM } from '@/hooks/useSchedule'

interface Props {
  slot: ScheduleSlot
  onClose: () => void
}

const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function SlotDetail({ slot, onClose }: Props) {
  const duration = getDurationFromHHMM(slot.startTime, slot.endTime)
  const hours = Math.floor(duration / 60)
  const mins  = duration % 60

  const isCancelled  = slot.exception?.type === 'cancelled'
  const isRoomChange = slot.exception?.type === 'room_change'
  const isTimeChange = slot.exception?.type === 'time_change'

  const displayRoom = isRoomChange && slot.exception?.newRoom
    ? slot.exception.newRoom
    : slot.room.name || slot.room.code

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white shadow-2xl lg:left-auto lg:right-6 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2 lg:w-80 lg:rounded-2xl">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
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

          {/* Jour */}
          <p className="text-sm font-medium text-gray-500">
            {DAY_LABELS[slot.dayOfWeek]} · S{slot.semester} {slot.academicYear}-{slot.academicYear + 1}
          </p>

          {/* Heure */}
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

          {/* Salle */}
          <div className="flex items-center gap-3 text-sm">
            <FiMapPin size={15} className="text-nc-cyan shrink-0" />
            <div>
              <span className="text-gray-700">{displayRoom}</span>
              {slot.room.building && (
                <span className="ml-1.5 text-xs text-gray-400">{slot.room.building}</span>
              )}
            </div>
          </div>

          {/* Type créneau */}
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
                <div>
                  <p className="font-medium">Cours annulé</p>
                  {slot.exception?.reason && (
                    <p className="mt-0.5 text-xs">{slot.exception.reason}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
