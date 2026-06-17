'use client'

// ============================================================
// src/components/academic/DayList.tsx
// Vue mobile – startTime/endTime sont "HH:MM", room est objet
// ============================================================

import type { WeekDay, ScheduleSlot } from '@/types/schedule'
import { getCourseColor, formatTime, getDurationFromHHMM } from '@/hooks/useSchedule'
import { FiMapPin, FiAlertTriangle } from 'react-icons/fi'
import clsx from 'clsx'

interface Props {
  weekDays: WeekDay[]
  onSlotClick: (slot: ScheduleSlot) => void
}

function SlotCard({ slot, onSlotClick }: { slot: ScheduleSlot; onSlotClick: (s: ScheduleSlot) => void }) {
  const color       = getCourseColor(slot.courseId)
  const duration    = getDurationFromHHMM(slot.startTime, slot.endTime)
  const hours       = Math.floor(duration / 60)
  const mins        = duration % 60
  const isCancelled = slot.exception?.type === 'cancelled'
  const hasException = slot.exception && !isCancelled

  return (
    <button
      onClick={() => onSlotClick(slot)}
      className={clsx(
        'w-full text-left rounded-xl border-l-4 p-3.5 transition hover:brightness-95',
        color.bg, color.border,
        isCancelled && 'opacity-40'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={clsx('text-sm font-semibold truncate', color.text)}>
            {slot.courseName || slot.courseCode || 'Cours'}
          </p>
          {slot.courseCode && slot.courseName && (
            <p className="text-[11px] text-gray-400 mt-0.5">{slot.courseCode}</p>
          )}
        </div>
        <span className="shrink-0 text-xs font-medium text-gray-400 mt-0.5">
          {hours > 0 ? `${hours}h` : ''}{mins > 0 ? `${mins}min` : ''}
        </span>
      </div>

      <p className="mt-2 text-xs font-medium text-gray-600">
        {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
      </p>

      {(slot.room.name || slot.room.code) && (
        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-gray-400">
          <FiMapPin size={10} />
          {slot.room.name || slot.room.code}
          {slot.room.building && ` · ${slot.room.building}`}
        </span>
      )}

      {isCancelled && (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-500">
          <FiAlertTriangle size={11} /> Cours annulé
        </p>
      )}
      {hasException && (
        <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-600">
          <FiAlertTriangle size={11} />
          {slot.exception?.type === 'room_change' ? 'Changement de salle' : 'Horaire modifié'}
        </p>
      )}
    </button>
  )
}

export default function DayList({ weekDays, onSlotClick }: Props) {
  return (
    <div className="md:hidden space-y-6">
      {weekDays.map((day) => (
        <div key={day.date.toISOString()}>
          <div className="flex items-center gap-3 mb-3">
            <div className={clsx(
              'flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full text-sm font-bold',
              day.isToday ? 'bg-nc-cyan text-white' : 'bg-gray-100 text-gray-500'
            )}>
              {day.date.getDate()}
            </div>
            <span className={clsx(
              'text-sm font-semibold capitalize',
              day.isToday ? 'text-nc-cyan' : 'text-gray-700'
            )}>
              {day.label}
            </span>
            <span className="ml-auto text-xs text-gray-400">
              {day.slots.length} cours
            </span>
          </div>

          {day.slots.length === 0 ? (
            <p className="pl-12 text-sm text-gray-300 italic">Pas de cours</p>
          ) : (
            <div className="pl-12 space-y-2">
              {day.slots
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((slot) => (
                  <SlotCard key={slot.scheduleId} slot={slot} onSlotClick={onSlotClick} />
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
