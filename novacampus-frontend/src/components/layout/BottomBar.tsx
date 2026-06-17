'use client'

// ============================================================
// src/components/layout/BottomBar.tsx
// Barre de navigation inférieure – mobile uniquement (< lg)
// Affiche les 4 items prioritaires selon le rôle
// ============================================================

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FiGrid, FiCalendar, FiAward, FiUserX, FiBookOpen,
  FiBook, FiEdit3, FiUsers, FiCreditCard, FiMapPin,
  FiBarChart2, FiTrendingUp,
} from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { getNavForRole, BOTTOM_BAR_PRIORITY } from '@/lib/navigation'
import type { NavItem } from '@/lib/navigation'

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  FiGrid, FiCalendar, FiAward, FiUserX, FiBookOpen,
  FiBook, FiEdit3, FiUsers, FiCreditCard, FiMapPin,
  FiBarChart2, FiTrendingUp,
}

function BottomItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon]

  // Label court pour la barre mobile
  const shortLabel = item.label.split(' ').slice(0, 2).join(' ')

  return (
    <Link
      href={item.href}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors"
    >
      <span
        className={`
          flex h-7 w-7 items-center justify-center rounded-lg transition-all
          ${active ? 'bg-nc-cyan/20' : ''}
        `}
      >
        {Icon && (
          <Icon
            size={20}
            className={active ? 'text-nc-cyan' : 'text-white/50'}
          />
        )}
      </span>
      <span
        className={`text-[10px] font-medium leading-tight text-center
          ${active ? 'text-nc-cyan' : 'text-white/50'}
        `}
      >
        {shortLabel}
      </span>
    </Link>
  )
}

export default function BottomBar() {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!user) return null

  const allItems   = getNavForRole(user.role)
  const priorities = BOTTOM_BAR_PRIORITY[user.role]

  // Sélectionne les 4 items prioritaires dans l'ordre défini
  const items = priorities
    .map((href) => allItems.find((i) => i.href === href))
    .filter(Boolean) as NavItem[]

  return (
    <nav
      className="
        lg:hidden fixed bottom-0 inset-x-0 z-40
        flex items-stretch
        bg-nc-navy border-t border-white/10
        safe-bottom
      "
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => (
        <BottomItem
          key={item.href + item.label}
          item={item}
          active={pathname === item.href || pathname.startsWith(item.href + '/')}
        />
      ))}
    </nav>
  )
}
