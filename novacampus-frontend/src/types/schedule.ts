// ============================================================
// src/types/schedule.ts
// Types alignés exactement sur planning-service et campus-service
// ============================================================

// ── Campus-service : /api/academic-years/current ─────────────
export interface AcademicYear {
  year: number          // 2024
  label: string         // "2024-2025"
  s1Start: string       // "2024-09-02"
  s1End: string
  s2Start: string
  s2End: string
  isCurrent: boolean
}

export interface CurrentSemester {
  year: number
  semester: number | null   // 1, 2, ou null si hors période
  label: string
}

export interface CurrentAcademicYearResponse {
  year: AcademicYear
  currentSemester: CurrentSemester | null
}

// ── Planning-service : /api/schedules/me ─────────────────────
// Réponse exacte : { status:'success', data: { week, slots } }
// dayOfWeek : 0=Lundi, 1=Mardi … 4=Vendredi (0=Lundi dans le planning-service)
export type ExceptionType = 'room_change' | 'time_change' | 'cancelled'

export interface ScheduleSlot {
  scheduleId: string
  courseId: string
  courseName: string        // '' si pas de jointure academic-service
  courseCode: string        // '' idem
  instructorId: string
  room: {
    id: string
    code: string            // ex: "P-TD-101"
    name: string            // ex: "Salle de TD 101"
    building: string        // ex: "Bâtiment B"
  }
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6   // 0=Lundi
  startTime: string         // "HH:MM" ex: "08:30"
  endTime: string           // "HH:MM" ex: "10:30"
  academicYear: number      // 2024
  semester: number          // 1 ou 2
  exception: {
    type: ExceptionType
    newRoom?: string
    newStartTime?: string
    newEndTime?: string
    reason: string
  } | null
}

export interface SchedulesApiResponse {
  week: string              // "2024-W03"
  slots: ScheduleSlot[]
}

// ── Vue locale : jour de la semaine ──────────────────────────
export interface WeekDay {
  date: Date
  label: string             // "Lun. 20 jan."
  isToday: boolean
  slots: ScheduleSlot[]
}

// Créneaux horaires affichés (08:00 → 20:00)
export const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
] as const
