'use client'

// ============================================================
// src/components/layout/AppShell.tsx
// Layout principal des pages authentifiées :
//   Desktop : Sidebar (gauche) + Navbar (haut) + contenu
//   Mobile  : Navbar (haut) + contenu + BottomBar (bas)
// ============================================================

import Sidebar from './Sidebar'
import Navbar from './Navbar'
import BottomBar from './BottomBar'

interface AppShellProps {
  children: React.ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-nc-light">

      {/* Sidebar – visible uniquement lg+ */}
      <Sidebar />

      {/* Zone droite : Navbar + contenu + padding bottom mobile */}
      <div className="flex flex-1 flex-col min-w-0">

        <Navbar />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          {children}
        </main>

      </div>

      {/* BottomBar – visible uniquement < lg */}
      <BottomBar />

    </div>
  )
}
