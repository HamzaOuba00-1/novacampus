'use client'

// ============================================================
// src/context/AuthContext.tsx
// Pattern workshop étape 7 – adapté Novacampus
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import * as authService from '@/services/auth.service'
import type { User, UserRole } from '@/types'

interface AuthContextValue {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Redirection par rôle après login
const ROLE_REDIRECT: Record<UserRole, string> = {
  student:    '/dashboard',
  instructor: '/dashboard',
  admin:      '/dashboard',
  direction:  '/direction',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser]               = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState<string | null>(null)

  // Hydration : restaure la session au chargement de l'app
  useEffect(() => {
    const stored = sessionStorage.getItem('nc_access_token')
    if (stored) {
      setAccessToken(stored)
      authService.getMe()
        .then(setUser)
        .catch(() => {
          sessionStorage.removeItem('nc_access_token')
          localStorage.removeItem('nc_refresh_token')
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    setIsLoading(true)
    try {
      const result = await authService.login({ email, password })

      sessionStorage.setItem('nc_access_token', result.accessToken)
      localStorage.setItem('nc_refresh_token', result.refreshToken)

      setAccessToken(result.accessToken)
      setUser(result.user)

      router.push(ROLE_REDIRECT[result.user.role])
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Identifiants incorrects'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('nc_refresh_token')
      if (refreshToken) await authService.logout(refreshToken)
    } catch {
      // déconnexion côté client dans tous les cas
    } finally {
      sessionStorage.removeItem('nc_access_token')
      localStorage.removeItem('nc_refresh_token')
      setAccessToken(null)
      setUser(null)
      router.push('/auth/login')
    }
  }, [router])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken && !!user,
        isLoading,
        error,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook personnalisé (pattern workshop)
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return ctx
}
