/**
 * utils/bcrypt.util.ts
 * ---------------------------------------------------------------
 * Fonctions utilitaires pour le hachage et la vérification
 * des mots de passe via la librairie bcrypt.
 *
 * Pourquoi bcrypt ?
 *   – Algorithme lent par conception : rend les attaques brute-force coûteuses
 *   – Le sel (salt) est généré automatiquement et intégré au hash
 *   – SALT_ROUNDS contrôle le coût de calcul (recommandé : 12 en production)
 *
 * Ces fonctions sont centralisées ici pour garantir que
 * le même algorithme est utilisé dans tout le service.
 * ---------------------------------------------------------------
 */

import bcrypt from 'bcrypt';

// Nombre de tours de hachage, configurable via .env
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS ?? '12', 10);

/**
 * Hache un mot de passe en clair avec bcrypt.
 * À utiliser lors de la création ou de la modification d'un compte.
 *
 * @param password - Le mot de passe en clair fourni par l'utilisateur
 * @returns Le hash bcrypt à stocker en base de données
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare un mot de passe en clair avec son hash stocké en base.
 * Utilise une comparaison en temps constant pour éviter les timing attacks.
 *
 * @param password - Le mot de passe en clair soumis lors de la connexion
 * @param hash - Le hash bcrypt stocké en base de données
 * @returns true si le mot de passe correspond, false sinon
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Valide la robustesse d'un mot de passe selon la politique de sécurité.
 * Règles : minimum 8 caractères, une majuscule, une minuscule, un chiffre.
 *
 * @param password - Le mot de passe à valider
 * @returns true si le mot de passe respecte la politique, false sinon
 */
export function isStrongPassword(password: string): boolean {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasDigit;
}
