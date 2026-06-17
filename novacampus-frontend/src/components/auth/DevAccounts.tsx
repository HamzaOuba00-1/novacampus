'use client'

// ============================================================
// src/components/auth/DevAccounts.tsx
// Comptes de test – séparé en 'use client' pour éviter
// le hydration mismatch sur <details> et process.env côté client
// ============================================================

export default function DevAccounts() {
  if (process.env.NODE_ENV === 'production') return null

  return (
    <details className="mt-6 rounded-lg border border-gray-100 bg-gray-50 text-xs">
      <summary className="cursor-pointer px-3 py-2 font-medium text-gray-400 select-none">
        Comptes de test (dev)
      </summary>
      <ul className="px-3 pb-3 pt-1 space-y-1 text-gray-500 font-mono">
        <li>admin@novacampus.fr · <span className="text-nc-navy font-semibold">Admin123!</span></li>
        <li>direction@novacampus.fr · <span className="text-nc-navy font-semibold">Direction123!</span></li>
        <li>prof.mercier@novacampus.fr · <span className="text-nc-navy font-semibold">Instructor123!</span></li>
        <li>etudiant.dupont@etu.novacampus.fr · <span className="text-nc-navy font-semibold">Student123!</span></li>
      </ul>
    </details>
  )
}
