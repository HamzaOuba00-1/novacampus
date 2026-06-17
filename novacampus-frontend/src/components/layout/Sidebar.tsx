'use client'

// ============================================================
// src/components/layout/Sidebar.tsx
// Sidebar desktop (≥ lg) – logo PNG en haut + nav par rôle
// ============================================================

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  FiGrid, FiCalendar, FiAward, FiUserX, FiBookOpen,
  FiBook, FiEdit3, FiUsers, FiCreditCard, FiMapPin,
  FiBarChart2, FiTrendingUp, FiLogOut, FiChevronRight,
} from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { getNavForRole } from '@/lib/navigation'
import type { NavItem } from '@/lib/navigation'

// Map icônes string → composants
const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FiGrid, FiCalendar, FiAward, FiUserX, FiBookOpen,
  FiBook, FiEdit3, FiUsers, FiCreditCard, FiMapPin,
  FiBarChart2, FiTrendingUp,
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon]
  return (
    <Link
      href={item.href}
      className={`
        group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
        transition-all duration-150
        ${active
          ? 'bg-nc-cyan/20 text-nc-cyan'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
        }
      `}
    >
      {Icon && (
        <Icon
          size={18}
          className={`shrink-0 transition-colors ${active ? 'text-nc-cyan' : 'text-white/50 group-hover:text-white'}`}
        />
      )}
      <span className="truncate">{item.label}</span>
      {active && <FiChevronRight size={14} className="ml-auto text-nc-cyan" />}
    </Link>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const navItems = getNavForRole(user.role)

  const roleLabel: Record<string, string> = {
    student:    'Étudiant',
    instructor: 'Enseignant',
    admin:      'Administration',
    direction:  'Direction',
  }

  return (
    <aside
      className="
        nc-sidebar hidden lg:flex flex-col
        w-64 shrink-0 min-h-screen
        bg-nc-navy border-r border-white/5
        overflow-y-auto
      "
    >
      {/* ── Logo ── */}
      <div className="flex items-center justify-center px-6 py-6 border-b border-white/10">
        <Image
          src="/images/logo-novacampus.png"
          alt="Novacampus Alliance"
          width={160}
          height={56}
          style={{ width: 160, height: 'auto' }}
          priority
        />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href + item.label}
            item={item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      {/* ── Profil + Déconnexion ── */}
      <div className="border-t border-white/10 px-3 py-4 space-y-2">
        {/* Infos utilisateur */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nc-cyan/20 text-nc-cyan text-sm font-bold uppercase">
            {user.email.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{user.email}</p>
            <p className="text-xs text-white/40">{roleLabel[user.role]}</p>
          </div>
        </div>

        {/* Bouton déconnexion */}
        <button
          onClick={logout}
          className="
            flex w-full items-center gap-3 rounded-lg px-3 py-2.5
            text-sm font-medium text-white/60
            hover:bg-white/10 hover:text-white
            transition-all duration-150
          "
        >
          <FiLogOut size={18} className="shrink-0" />
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}
