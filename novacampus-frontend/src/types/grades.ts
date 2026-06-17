// ============================================================
// src/types/grades.ts
// Types alignés sur academic-service
// ============================================================

export type EnrollmentStatus = 'enrolled' | 'validated' | 'failed' | 'withdrawn'

// ── GET /api/students/:id/enrollments ────────────────────────
export interface Enrollment {
  id: string
  studentId: string
  courseId: string
  academicYear: number       // 2023 pour "2023-2024"
  semester: number           // 1 ou 2
  status: EnrollmentStatus
  finalGrade: string | null  // DECIMAL retourné en string par Sequelize/PG
  attendanceRate: string | null
  enrolledAt: string
  validatedAt: string | null
}

// ── GET /api/enrollments/:enrollmentId/grades ────────────────
export interface Grade {
  id: string
  enrollmentId: string
  instructorId: string
  label: string              // "Partiel 1", "Projet groupe"…
  value: string              // DECIMAL(4,2) → string ex "14.50"
  weight: string             // DECIMAL(4,2) → string ex "1.00"
  comment: string | null
  gradedAt: string
  createdAt: string
}

// ── GET /api/courses/:id ──────────────────────────────────────
export interface Course {
  id: string
  programId: string
  leadInstructorId: string | null
  code: string                // ex "INFO301"
  name: string                // ex "Bases de données avancées"
  semester: number
  credits: number
  hoursTotal: number
  description: string | null
  status: 'active' | 'archived'
}

// ── Vue locale : un cours avec son inscription, ses notes ────
export interface CourseGrades {
  enrollment: Enrollment
  course: Course | null       // null si fetch échoue
  grades: Grade[]
}

// Note de passage (config globale campus-service : academic.passing_grade = 10.0)
export const PASSING_GRADE = 10
