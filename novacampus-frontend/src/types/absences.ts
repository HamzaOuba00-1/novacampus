// ============================================================
// src/types/absences.ts
// Types alignés sur academic-service – modèles Absence + Enrollment
// ============================================================

export type AbsenceType = 'absent' | 'late' | 'justified'

// ── GET /api/students/:id/absences ───────────────────────────
export interface Absence {
  id: string
  enrollmentId: string
  scheduleId: string
  sessionDate: string        // "YYYY-MM-DD"
  type: AbsenceType
  justification: string | null
  recordedBy: string
  recordedAt: string
}

// ── Enrollment simplifié pour le rattachement au cours ───────
// On charge les enrollments depuis grades.service (déjà fait)
// puis on croise avec les absences via enrollmentId
export interface AbsenceWithCourse extends Absence {
  courseCode: string | null
  courseName: string | null
  semester: number | null
  academicYear: number | null
}

// ── Résumé par cours ─────────────────────────────────────────
export interface CourseAbsenceSummary {
  enrollmentId: string
  courseId: string
  courseCode: string
  courseName: string
  semester: number
  academicYear: number
  attendanceRate: number | null   // % en string depuis Sequelize
  absences: Absence[]
  absentCount: number
  lateCount: number
  justifiedCount: number
  total: number
}

// Labels et couleurs par type
export const ABSENCE_META: Record<AbsenceType, { label: string; bg: string; text: string; dot: string }> = {
  absent:    { label: 'Absent',    bg: 'bg-red-50',          text: 'text-red-600',     dot: 'bg-red-400'    },
  late:      { label: 'Retard',    bg: 'bg-amber-50',        text: 'text-amber-600',   dot: 'bg-amber-400'  },
  justified: { label: 'Justifié', bg: 'bg-nc-success/10',   text: 'text-nc-success',  dot: 'bg-nc-success' },
}
