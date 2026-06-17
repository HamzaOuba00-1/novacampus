// ============================================================
// src/types/index.ts
// Miroir exact des types définis dans auth-service/src/types/index.ts
// ============================================================

// Rôles – ENUM identique au modèle Sequelize
export type UserRole = 'student' | 'instructor' | 'admin' | 'direction'

// Payload JWT décodé (ce que /api/auth/me retourne dans data)
export interface JwtPayload {
  id: string
  email: string
  role: UserRole
  campusId?: string
}

// Utilisateur courant (issu de req.user côté auth-service)
export type User = JwtPayload

// Réponse normalisée de l'API – { status, data?, message?, code? }
export interface ApiResponse<T = unknown> {
  status: 'success' | 'failure' | 'pending'
  data?: T
  message?: string
  code?: string
}

// Résultat du login (data dans la réponse)
export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: User
}

// Résultat du refresh (data dans la réponse)
export interface RefreshResult {
  accessToken: string
  refreshToken: string
}
