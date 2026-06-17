'use client'

// ============================================================
// src/components/academic/WeekView.tsx
// Grille semaine desktop – startTime/endTime sont "HH:MM"
// ============================================================

import type { WeekDay, ScheduleSlot } from '@/types/schedule'
import { TIME_SLOTS } from '@/types/schedule'
import { getCourseColor, formatTime } from '@/hooks/useSchedule'
import clsx from 'clsx'

interface Props {
  weekDays: WeekDay[]
  onSlotClick: (slot: ScheduleSlot) => void
}

const GRID_START = 8 * 60   // 08:00
const GRID_TOTAL = 12 * 60  // 720 min → 100%

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function slotStyle(startTime: string, endTime: string) {
  const startMin = timeToMinutes(startTime) - GRID_START
  const endMin   = timeToMinutes(endTime)   - GRID_START
  return {
    top:    `${(startMin / GRID_TOTAL) * 100}%`,
    height: `${((endMin - startMin) / GRID_TOTAL) * 100}%`,
  }
}

export default function WeekView({ weekDays, onSlotClick }: Props) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <div className="min-w-[640px]">

        {/* En-tête jours */}
        <div className="grid grid-cols-[56px_repeat(5,1fr)] border-b border-gray-200 mb-0">
          <div />
          {weekDays.map((day) => (
            <div
              key={day.date.toISOString()}
              className={clsx(
                'py-3 text-center border-l border-gray-100',
                day.isToday ? 'text-nc-cyan' : 'text-gray-500'
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide block">
                {day.label.split(' ')[0]}
              </span>
              <span className={clsx(
                'mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold',
                day.isToday ? 'bg-nc-cyan text-white' : 'text-gray-700'
              )}>
                {day.date.getDate()}
              </span>
            </div>
          ))}
        </div>

        {/* Grille */}
        <div className="relative grid grid-cols-[56px_repeat(5,1fr)]" style={{ height: '648px' }}>

          {/* Heures */}
          <div className="relative">
            {TIME_SLOTS.slice(0, -1).map((slot, i) => (
              <div
                key={slot}
                className="absolute w-full pr-2 text-right -translate-y-2"
                style={{ top: `${(i / 12) * 100}%` }}
              >
                <span className="text-[10px] text-gray-400">{slot}</span>
              </div>
            ))}
          </div>

          {/* Colonnes jours */}
          {weekDays.map((day) => (
            <div key={day.date.toISOString()} className="relative border-l border-gray-100">
              {/* Lignes horizontales */}
              {TIME_SLOTS.slice(0, -1).map((_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-gray-100"
                  style={{ top: `${(i / 12) * 100}%` }}
                />
              ))}

              {/* Créneaux */}
              {day.slots
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((slot) => {
                  const color = getCourseColor(slot.courseId)
                  const isCancelled = slot.exception?.type === 'cancelled'
                  return (
                    <button
                      key={slot.scheduleId}
                      onClick={() => onSlotClick(slot)}
                      style={slotStyle(slot.startTime, slot.endTime)}
                      className={clsx(
                        'absolute inset-x-0.5 rounded-lg border-l-[3px] px-2 py-1 text-left',
                        'hover:brightness-95 transition-all cursor-pointer overflow-hidden',
                        color.bg, color.border,
                        isCancelled && 'opacity-40 line-through'
                      )}
                    >
                      <p className={clsx('text-[11px] font-semibold truncate leading-tight', color.text)}>
                        {slot.courseName || slot.courseCode || 'Cours'}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">
                        {formatTime(slot.startTime)} · {slot.room.code || slot.room.name}
                      </p>
                    </button>
                  )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
