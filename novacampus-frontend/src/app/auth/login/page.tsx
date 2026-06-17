// ============================================================
// src/app/auth/login/page.tsx
// Server Component – pas de Date.now() ni de condition NODE_ENV client
// ============================================================

import Image from 'next/image'
import LoginForm from '@/components/auth/LoginForm'
import DevAccounts from '@/components/auth/DevAccounts'

export const metadata = {
  title: 'Connexion – Novacampus Alliance',
}

export default function LoginPage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #002044 0%, #1c3d5e 50%, #002044 100%)' }}
    >
      <div className="w-full max-w-md">

        {/* Logo PNG */}
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Image
            src="/images/logo-novacampus.png"
            alt="Novacampus Alliance"
            width={200}
            height={72}
            style={{ width: 200, height: 'auto' }}
            priority
          />
          <p className="text-sm text-white/50 tracking-wide">
            Système de gestion unifié
          </p>
        </div>

        {/* Carte */}
        <div className="rounded-2xl bg-white px-8 py-8 shadow-2xl shadow-black/40">
          <h2 className="mb-1 text-lg font-semibold text-nc-navy">
            Connexion à votre espace
          </h2>
          <p className="mb-6 text-xs text-gray-400">
            Entrez vos identifiants pour accéder à la plateforme
          </p>

          <LoginForm />

          {/* Comptes de test – rendu côté client pour éviter hydration mismatch */}
          <DevAccounts />
        </div>

        {/* Footer – année statique pour éviter mismatch SSR/client */}
        <p className="mt-6 text-center text-xs text-white/30">
          © 2025 Novacampus Alliance – Tous droits réservés
        </p>
      </div>
    </main>
  )
}
