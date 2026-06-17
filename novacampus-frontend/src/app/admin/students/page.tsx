'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import AppShell from '@/components/layout/AppShell'

export default function StudentsPage() {
  const { isLoading } = useRequireAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nc-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nc-cyan border-t-transparent" />
      </div>
    )
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Étudiants</h2>
        <p className="text-sm text-gray-500">Contenu à venir…</p>
      </div>
    </AppShell>
  )
}
