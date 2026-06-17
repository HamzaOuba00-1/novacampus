'use client'

// ============================================================
// src/hooks/useSchedule.ts
// CORRECTION finale : suppression de getMyCourseIds
// Le planning-service accepte désormais courseIds optionnel
// On envoie week uniquement → le service filtre via JWT
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  getMySchedule,
  getCurrentAcademicYear,
  dateToISOWeek,
} from '@/services/schedule.service'
import type { ScheduleSlot, WeekDay, CurrentAcademicYearResponse } from '@/types/schedule'

const COURSE_COLORS = [
  { bg: 'bg-nc-cyan/15',     border: 'border-l-nc-cyan',     text: 'text-[#006d87]'  },
  { bg: 'bg-nc-purple/15',   border: 'border-l-nc-purple',   text: 'text-nc-purple'  },
  { bg: 'bg-nc-purplelg/15', border: 'border-l-nc-purplelg', text: 'text-nc-purplelg'},
  { bg: 'bg-nc-success/15',  border: 'border-l-nc-success',  text: 'text-nc-success' },
  { bg: 'bg-nc-warning/15',  border: 'border-l-nc-warning',  text: 'text-[#8a6100]'  },
]
const colorCache = new Map<string, (typeof COURSE_COLORS)[number]>()
let colorIndex = 0

export function getCourseColor(courseId: string) {
  if (!colorCache.has(courseId)) {
    colorCache.set(courseId, COURSE_COLORS[colorIndex % COURSE_COLORS.length])
    colorIndex++
  }
  return colorCache.get(courseId)!
}

export function formatTime(hhmm: string): string {
  return hhmm
}

export function getDurationFromHHMM(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em) - (sh * 60 + sm)
}

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function buildWeekDays(monday: Date, slots: ScheduleSlot[]): WeekDay[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return {
      date,
      label: date.toLocaleDateString('fr-FR', {
        weekday: 'short', day: 'numeric', month: 'short',
      }),
      isToday: date.getTime() === today.getTime(),
      slots: slots.filter((s) => s.dayOfWeek === i),
    }
  })
}

export function useSchedule() {
  const { user } = useAuth()

  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOf(new Date()))
  const [slots, setSlots]               = useState<ScheduleSlot[]>([])
  const [academicYear, setAcademicYear] = useState<CurrentAcademicYearResponse | null>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null)

  const fetchSchedules = useCallback(async (monday: Date) => {
    setIsLoading(true)
    setError(null)
    try {
      const isoWeek = dateToISOWeek(monday)
      // Pas de courseIds → le planning-service filtre via JWT
      const [fetchedSlots, ay] = await Promise.all([
        getMySchedule(isoWeek),
        getCurrentAcademicYear(),
      ])
      setSlots(fetchedSlots)
      setAcademicYear(ay)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchSchedules(currentMonday)
  }, [currentMonday, fetchSchedules])

  const goToPrevWeek = useCallback(() => {
    setCurrentMonday((m) => { const d = new Date(m); d.setDate(d.getDate() - 7); return d })
  }, [])
  const goToNextWeek = useCallback(() => {
    setCurrentMonday((m) => { const d = new Date(m); d.setDate(d.getDate() + 7); return d })
  }, [])
  const goToToday = useCallback(() => {
    setCurrentMonday(getMondayOf(new Date()))
  }, [])

  const weekDays = buildWeekDays(currentMonday, slots)
  const friday = new Date(currentMonday)
  friday.setDate(currentMonday.getDate() + 4)
  const weekLabel = `${currentMonday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${friday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const isCurrentWeek = getMondayOf(new Date()).getTime() === currentMonday.getTime()

  return {
    weekDays, weekLabel,
    isoWeek: dateToISOWeek(currentMonday),
    academicYear, isLoading, error, isCurrentWeek,
    selectedSlot, setSelectedSlot,
    goToPrevWeek, goToNextWeek, goToToday,
  }
}
