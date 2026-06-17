'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import AppShell from '@/components/layout/AppShell'

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nc-light">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-nc-cyan border-t-transparent" />
      </div>
    )
  }

  const roleLabel: Record<string, string> = {
    student:    'Étudiant',
    instructor: 'Enseignant',
    admin:      'Administration',
    direction:  'Direction',
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* En-tête */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Bonjour 👋
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Connecté en tant que <span className="font-medium text-nc-navy">{user?.email}</span>
            {' '}· <span className="capitalize">{user?.role ? roleLabel[user.role] : ''}</span>
          </p>
        </div>

        {/* Placeholder cartes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Cours cette semaine', value: '6', color: 'bg-nc-cyan/10 text-nc-cyan' },
            { label: 'Absences', value: '2', color: 'bg-nc-alert/10 text-nc-alert' },
            { label: 'Moyenne générale', value: '14.2', color: 'bg-nc-success/10 text-nc-success' },
            { label: 'Documents', value: '12', color: 'bg-nc-purple/10 text-nc-purple' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
