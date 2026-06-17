// ============================================================
// src/services/schedule.service.ts
// CORRECTION : courseIds supprimé (planning-service patché)
// GET /api/schedules/me?week=YYYY-Www   (week seul suffit)
// ============================================================

import apiClient from '@/lib/apiClient'
import type {
  ScheduleSlot,
  SchedulesApiResponse,
  CurrentAcademicYearResponse,
} from '@/types/schedule'
import type { ApiResponse } from '@/types'

// Convertit une Date en format ISO semaine "YYYY-Www"
export function dateToISOWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const yearStart = new Date(d.getFullYear(), 0, 4)
  const weekNum = Math.round(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 -
      3 + ((yearStart.getDay() + 6) % 7)) / 7
  ) + 1
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

// ── GET /api/planning/schedules/me?week=YYYY-Www ─────────────
// Le gateway préfixe les routes planning-service par /api/planning/
// (voir nginx.conf : location /api/planning/schedules → planning-service:3003/api/schedules)
// courseIds n'est plus envoyé – le planning-service filtre via JWT
export const getMySchedule = async (isoWeek: string): Promise<ScheduleSlot[]> => {
  const { data } = await apiClient.get<ApiResponse<SchedulesApiResponse>>(
    '/api/planning/schedules/me',
    { params: { week: isoWeek } }
  )
  return data.data?.slots ?? []
}

// ── GET /api/academic-years/current ──────────────────────────
export const getCurrentAcademicYear =
  async (): Promise<CurrentAcademicYearResponse> => {
    const { data } = await apiClient.get<ApiResponse<CurrentAcademicYearResponse>>(
      '/api/academic-years/current'
    )
    return data.data!
  }
