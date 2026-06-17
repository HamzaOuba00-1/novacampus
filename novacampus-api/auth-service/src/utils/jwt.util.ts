/**
 * utils/jwt.util.ts
 * ---------------------------------------------------------------
 * Fonctions utilitaires pour la gestion des JSON Web Tokens (JWT).
 *
 * Architecture des tokens :
 *   – Access token  : durée courte (15 min), utilisé pour chaque requête API
 *   – Refresh token : durée longue (7 jours), utilisé uniquement pour renouveler
 *                     l'access token via /auth/refresh
 *
 * Les deux tokens utilisent des secrets distincts pour que la
 * compromission d'un secret n'affecte pas l'autre type de token.
 *
 * Sécurité :
 *   – Les secrets doivent être des chaînes aléatoires de 256+ bits en production
 *   – Générer avec : openssl rand -base64 32
 * ---------------------------------------------------------------
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtPayload } from '../types';

// Lecture des secrets depuis les variables d'environnement
const JWT_SECRET = process.env.JWT_SECRET ?? 'change_me_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'refresh_change_me';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

/**
 * Génère un access token JWT signé avec le payload utilisateur.
 * Le token est de courte durée pour limiter l'exposition en cas de vol.
 *
 * @param payload - Données à embarquer dans le token (id, email, role)
 * @returns La chaîne JWT signée
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Génère un refresh token JWT signé avec un secret distinct.
 * Embarque uniquement l'id utilisateur pour minimiser les données exposées.
 *
 * @param userId - Identifiant UUID de l'utilisateur
 * @returns La chaîne JWT de rafraîchissement signée
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Vérifie et décode un access token JWT.
 * Retourne null si le token est invalide, malformé ou expiré.
 *
 * @param token - La chaîne JWT à vérifier
 * @returns Le payload décodé ou null en cas d'échec
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Vérifie et décode un refresh token JWT.
 * Retourne null si le token est invalide ou expiré.
 *
 * @param token - Le refresh token à vérifier
 * @returns L'objet décodé contenant l'id ou null
 */
export function verifyRefreshToken(token: string): { id: string } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
  } catch {
    return null;
  }
}

/**
 * Décode un token JWT sans vérifier sa signature.
 * Utile pour lire les données d'un token expiré (ex : logs).
 * NE PAS utiliser pour autoriser un accès.
 *
 * @param token - La chaîne JWT à décoder
 * @returns Le payload décodé sans vérification de signature
 */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}

/**
 * Génère un hash SHA-256 d'un refresh token brut.
 * Seul ce hash est stocké en base de données, jamais le token en clair.
 *
 * @param token - Le token brut à hacher
 * @returns La représentation hexadécimale du hash SHA-256
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
