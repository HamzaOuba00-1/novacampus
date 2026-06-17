'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import AppShell from '@/components/layout/AppShell'

export default function DirectionPage() {
  const { isLoading } = useRequireAuth({ allowedRoles: ['direction'] })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nc-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nc-cyan border-t-transparent" />
      </div>
    )
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">KPIs & Reporting</h2>
          <p className="mt-1 text-sm text-gray-500">Indicateurs consolidés multi-campus</p>
        </div>
        {/* TODO: KPIs, IA insights */}
      </div>
    </AppShell>
  )
}
