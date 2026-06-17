/**
 * types/index.ts
 * ---------------------------------------------------------------
 * Définitions de types et interfaces TypeScript partagées
 * dans l'ensemble du service d'authentification.
 *
 * Centraliser les types ici évite les doublons et garantit
 * la cohérence entre les couches (service, controller, middleware).
 * ---------------------------------------------------------------
 */

import { Request } from 'express';

// ---------------------------------------------------------------
// Rôles utilisateur disponibles dans le système
// Correspond à l'ENUM défini dans le modèle User et la base de données
// ---------------------------------------------------------------
export type UserRole = 'student' | 'instructor' | 'admin' | 'direction';

// ---------------------------------------------------------------
// Payload embarqué dans le JWT d'accès
// Ces données sont lues par la gateway et les autres microservices
// sans requête supplémentaire à la base de données
// ---------------------------------------------------------------
export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  campusId?: string;
}

// ---------------------------------------------------------------
// Extension de l'interface Request d'Express
// Permet d'attacher les données décodées du JWT à chaque requête
// après passage par le middleware authenticate
// ---------------------------------------------------------------
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ---------------------------------------------------------------
// Réponse normalisée – format uniforme pour tous les endpoints
// Correspond au contrat défini dans l'architecture (success/failure/pending)
// ---------------------------------------------------------------
export interface ApiResponse<T = unknown> {
  status: 'success' | 'failure' | 'pending';
  data?: T;
  message?: string;
  code?: string;
}

// ---------------------------------------------------------------
// Corps attendu pour les requêtes d'enregistrement
// ---------------------------------------------------------------
export interface RegisterBody {
  email: string;
  password: string;
  role?: UserRole;
  campusId?: string;
}

// ---------------------------------------------------------------
// Corps attendu pour les requêtes de connexion
// ---------------------------------------------------------------
export interface LoginBody {
  email: string;
  password: string;
}

// ---------------------------------------------------------------
// Corps attendu pour le changement de mot de passe
// ---------------------------------------------------------------
export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

// ---------------------------------------------------------------
// Résultat retourné après une connexion réussie
// ---------------------------------------------------------------
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    campusId?: string;
  };
}
