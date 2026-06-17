// ============================================================
// src/services/auth.service.ts
// Appels API auth – alignés sur auth-service/src/routes/auth.route.ts
// Toutes les réponses ont la forme { status, data }
// ============================================================

import apiClient from '@/lib/apiClient'
import type { ApiResponse, LoginResult, RefreshResult, User } from '@/types'

export interface LoginCredentials {
  email: string
  password: string
}

// POST /api/auth/login → { status:'success', data: LoginResult }
export const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
  const { data } = await apiClient.post<ApiResponse<LoginResult>>(
    '/api/auth/login',
    credentials
  )
  return data.data!
}

// POST /api/auth/refresh → { status:'success', data: RefreshResult }
export const refreshTokens = async (
  refreshToken: string
): Promise<RefreshResult> => {
  const { data } = await apiClient.post<ApiResponse<RefreshResult>>(
    '/api/auth/refresh',
    { refreshToken }
  )
  return data.data!
}

// POST /api/auth/logout → { status:'success', message }
export const logout = async (refreshToken: string): Promise<void> => {
  await apiClient.post('/api/auth/logout', { refreshToken })
}

// POST /api/auth/logout-all
export const logoutAll = async (): Promise<void> => {
  await apiClient.post('/api/auth/logout-all')
}

// GET /api/auth/me → { status:'success', data: JwtPayload }
export const getMe = async (): Promise<User> => {
  const { data } = await apiClient.get<ApiResponse<User>>('/api/auth/me')
  return data.data!
}

// PATCH /api/auth/me/password
export const changePassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  await apiClient.patch('/api/auth/me/password', { currentPassword, newPassword })
}
