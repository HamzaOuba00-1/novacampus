'use client'

// ============================================================
// src/components/layout/Navbar.tsx
// Barre supérieure – titre de la page + avatar utilisateur
// Visible sur desktop ET mobile
// ============================================================

import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { FiBell, FiLogOut } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import { NAV_ITEMS } from '@/lib/navigation'

// Déduit le titre de la page depuis le pathname
function getPageTitle(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
  return match?.label ?? 'Novacampus Alliance'
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">

      {/* Logo mobile (visible uniquement < lg) */}
      <div className="flex items-center lg:hidden">
        <Image
          src="/images/logo-novacampus.png"
          alt="Novacampus Alliance"
          width={120}
          height={40}
          style={{ width: 120, height: 'auto' }}
          priority
        />
      </div>

      {/* Titre de la page (desktop) */}
      <h1 className="hidden lg:block text-base font-semibold text-gray-900 truncate">
        {title}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions droite */}
      <div className="flex items-center gap-2">

        {/* Cloche notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
          aria-label="Notifications"
        >
          <FiBell size={18} />
          {/* Badge point rouge */}
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-nc-alert" />
        </button>

        {/* Avatar + email */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nc-navy text-nc-cyan text-sm font-bold uppercase">
              {user.email.charAt(0)}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[160px] truncate">
              {user.email}
            </span>
          </div>
        )}

        {/* Logout – visible mobile uniquement (sidebar le gère sur desktop) */}
        <button
          onClick={logout}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition"
          aria-label="Se déconnecter"
        >
          <FiLogOut size={18} />
        </button>
      </div>
    </header>
  )
}
