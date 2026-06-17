/**
 * utils/jwt.util.ts
 * ---------------------------------------------------------------
 * Vérification des JWT émis par l'auth-service.
 * Utilisé à la fois dans le middleware HTTP et dans le gateway WS.
 * ---------------------------------------------------------------
 */

import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'change_me_in_production';

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
