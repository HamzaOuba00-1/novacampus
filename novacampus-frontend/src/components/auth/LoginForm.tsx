'use client'

// ============================================================
// src/components/auth/LoginForm.tsx
// Formulaire de connexion – couleurs charte Novacampus
// ============================================================

import { useState, useEffect } from 'react'
import { FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'

export default function LoginForm() {
  const { login, isLoading, error, clearError } = useAuth()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)

  useEffect(() => {
    if (error) clearError()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email.trim(), password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* Erreur API */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <FiAlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@novacampus.fr"
          disabled={isLoading}
          className="
            w-full rounded-lg border border-gray-300 bg-white
            px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400
            outline-none transition
            focus:border-nc-cyan focus:ring-2 focus:ring-nc-cyan/20
            disabled:opacity-50
          "
        />
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            className="
              w-full rounded-lg border border-gray-300 bg-white
              px-3.5 py-2.5 pr-10 text-sm text-gray-900 placeholder-gray-400
              outline-none transition
              focus:border-nc-cyan focus:ring-2 focus:ring-nc-cyan/20
              disabled:opacity-50
            "
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPwd ? 'Masquer' : 'Afficher'}
          >
            {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
          </button>
        </div>
      </div>

      {/* Bouton connexion */}
      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className="
          w-full rounded-lg px-4 py-2.5
          text-sm font-semibold text-white
          transition hover:opacity-90 active:scale-[.98]
          focus:outline-none focus:ring-2 focus:ring-nc-cyan focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
        "
        style={{ backgroundColor: '#002044' }}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Connexion en cours…
          </span>
        ) : (
          'Se connecter'
        )}
      </button>

    </form>
  )
}
