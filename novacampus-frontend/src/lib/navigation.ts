// ============================================================
// src/lib/navigation.ts
// Définit les menus par rôle – utilisé par Sidebar et BottomBar
// ============================================================

import type { UserRole } from '@/types'

export interface NavItem {
  label: string
  href: string
  icon: string          // nom icône react-icons (Fi = Feather)
  roles: UserRole[]     // quels rôles voient cet item
}

export const NAV_ITEMS: NavItem[] = [
  // ── Commun à tous ──────────────────────────────────────────
  {
    label: 'Tableau de bord',
    href: '/dashboard',
    icon: 'FiGrid',
    roles: ['student', 'instructor', 'admin', 'direction'],
  },

  // ── Étudiant ───────────────────────────────────────────────
  {
    label: 'Mon emploi du temps',
    href: '/academic/schedules',
    icon: 'FiCalendar',
    roles: ['student'],
  },

  // ── Enseignant ─────────────────────────────────────────────
  {
    label: 'Mon planning',
    href: '/instructor/schedules',
    icon: 'FiCalendar',
    roles: ['instructor'],
  },
  {
    label: 'Mes notes',
    href: '/academic/grades',
    icon: 'FiAward',
    roles: ['student'],
  },
  {
    label: 'Mes absences',
    href: '/academic/absences',
    icon: 'FiUserX',
    roles: ['student', 'instructor', 'admin'],
  },
  {
    label: 'Ressources',
    href: '/academic/resources',
    icon: 'FiBookOpen',
    roles: ['student', 'instructor'],
  },

  // ── Enseignant ─────────────────────────────────────────────
  {
    label: 'Mes cours',
    href: '/academic/courses',
    icon: 'FiBook',
    roles: ['instructor', 'admin'],
  },
  {
    label: 'Saisie des notes',
    href: '/academic/grades',
    icon: 'FiEdit3',
    roles: ['instructor'],
  },

  // ── Administration ─────────────────────────────────────────
  {
    label: 'Étudiants',
    href: '/admin/students',
    icon: 'FiUsers',
    roles: ['admin'],
  },
  {
    label: 'Paiements',
    href: '/admin/payments',
    icon: 'FiCreditCard',
    roles: ['admin'],
  },
  {
    label: 'Planning & Salles',
    href: '/admin/planning',
    icon: 'FiMapPin',
    roles: ['admin'],
  },

  // ── Direction ──────────────────────────────────────────────
  {
    label: 'KPIs & Reporting',
    href: '/direction',
    icon: 'FiBarChart2',
    roles: ['direction'],
  },
  {
    label: 'Revenus',
    href: '/admin/payments',
    icon: 'FiTrendingUp',
    roles: ['direction'],
  },
]

// Filtre les items visibles pour un rôle donné
export function getNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

// Items prioritaires pour la BottomBar mobile (max 4)
export const BOTTOM_BAR_PRIORITY: Record<UserRole, string[]> = {
  student:    ['/dashboard', '/academic/schedules', '/academic/grades', '/academic/absences'],
  instructor: ['/dashboard', '/instructor/schedules', '/academic/courses', '/academic/absences'],
  admin:      ['/dashboard', '/admin/students', '/admin/payments', '/admin/planning'],
  direction:  ['/dashboard', '/direction', '/admin/payments', '/academic/schedules'],
}
