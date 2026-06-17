// ============================================================
// src/lib/apiClient.ts
// Client Axios – pointe vers le gateway NGINX (port 8080)
// Injecte automatiquement le Bearer token sur chaque requête
// Gère le refresh silencieux sur erreur 401
// ============================================================

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8080'

export const apiClient = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// ---- Requête : injecte le Bearer token ----
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window === 'undefined') return config
    const token = sessionStorage.getItem('nc_access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ---- Réponse : refresh silencieux sur 401 ----
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (
      error.response?.status === 401 &&
      !original._retry &&
      original.url !== '/api/auth/refresh'
    ) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('nc_refresh_token')
        if (!refreshToken) throw new Error('no refresh token')

        const { data } = await apiClient.post('/api/auth/refresh', { refreshToken })
        const tokens = data.data as { accessToken: string; refreshToken: string }

        sessionStorage.setItem('nc_access_token', tokens.accessToken)
        localStorage.setItem('nc_refresh_token', tokens.refreshToken)

        if (original.headers) {
          original.headers.Authorization = `Bearer ${tokens.accessToken}`
        }
        return apiClient(original)
      } catch {
        sessionStorage.removeItem('nc_access_token')
        localStorage.removeItem('nc_refresh_token')
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
