'use client'

// ============================================================
// src/hooks/useRequireAuth.ts
// Protège une page – redirige si non authentifié ou mauvais rôle
// ============================================================

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'

interface Options {
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function useRequireAuth(options: Options = {}) {
  const { allowedRoles, redirectTo = '/auth/login' } = options
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace(redirectTo)
      return
    }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoading, user, allowedRoles, redirectTo, router])

  return { isAuthenticated, isLoading, user }
}
