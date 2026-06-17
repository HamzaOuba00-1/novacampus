/**
 * utils/jwt.util.ts
 * ---------------------------------------------------------------
 * Vérification des JWT émis par l'auth-service.
 *
 * Le service académique ne génère JAMAIS de tokens.
 * Il se contente de vérifier ceux reçus via les headers
 * en utilisant le même secret que l'auth-service.
 *
 * Le secret doit être identique dans les .env des deux services.
 * ---------------------------------------------------------------
 */

import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change_me_in_production';

/**
 * Vérifie et décode un access token JWT.
 * Retourne null si le token est invalide ou expiré.
 *
 * @param token - La chaîne JWT extraite du header Authorization
 * @returns Le payload décodé ou null
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
