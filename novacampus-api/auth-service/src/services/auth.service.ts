/**
 * services/auth.service.ts
 * ---------------------------------------------------------------
 * Couche service du module d'authentification.
 *
 * Responsabilités :
 *   – Encapsuler toute la logique métier liée à l'authentification
 *   – Orchestrer les appels aux modèles (User, RefreshToken)
 *   – Ne jamais communiquer directement avec la couche HTTP (req/res)
 *
 * Les controllers appellent ce service ; ils ne connaissent pas
 * les détails d'implémentation (Sequelize, bcrypt, JWT).
 * ---------------------------------------------------------------
 */

import { Op } from 'sequelize';
import User from '../models/user.model';
import RefreshToken from '../models/refreshToken.model';
import { hashPassword, comparePassword, isStrongPassword } from '../utils/bcrypt.util';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
} from '../utils/jwt.util';
import { JwtPayload, LoginResult, RegisterBody, UserRole } from '../types';

// ---------------------------------------------------------------
// Durée de vie du refresh token en millisecondes (7 jours)
// ---------------------------------------------------------------
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Inscrit un nouvel utilisateur dans le système.
 * Vérifie l'unicité de l'email, valide la robustesse du mot de passe,
 * hache le mot de passe et crée l'entrée en base.
 *
 * @param body - Données d'inscription (email, password, role, campusId)
 * @returns Les informations publiques du compte créé
 * @throws Error si l'email existe déjà ou si le mot de passe est trop faible
 */
export async function register(body: RegisterBody): Promise<{
  id: string;
  email: string;
  role: UserRole;
}> {
  const { email, password, role = 'student', campusId } = body;

  // Vérification de la politique de mot de passe avant toute requête DB
  if (!isStrongPassword(password)) {
    throw new Error(
      'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.'
    );
  }

  // Vérification de l'unicité de l'email (insensible à la casse)
  const existing = await User.findOne({
    where: { email: email.toLowerCase().trim() },
  });
  if (existing) {
    throw new Error('Un compte avec cet email existe déjà.');
  }

  // Hachage du mot de passe – ne jamais stocker en clair
  const passwordHash = await hashPassword(password);

  // Création de l'utilisateur en base de données
  const newUser = await User.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    campusId: campusId ?? null,
  });

  // Retourner uniquement les informations non sensibles
  return {
    id: newUser.id,
    email: newUser.email,
    role: newUser.role,
  };
}

/**
 * Authentifie un utilisateur avec son email et son mot de passe.
 * En cas de succès, génère un access token (15 min) et un refresh token (7 jours),
 * puis persiste le refresh token haché en base de données.
 *
 * @param email - Adresse email de l'utilisateur
 * @param password - Mot de passe en clair soumis par l'utilisateur
 * @param deviceInfo - Informations sur l'appareil (User-Agent, IP)
 * @returns Les tokens et les informations publiques de l'utilisateur
 * @throws Error si les identifiants sont incorrects ou le compte inactif
 */
export async function login(
  email: string,
  password: string,
  deviceInfo?: object
): Promise<LoginResult> {
  // Recherche de l'utilisateur par email (normalisé en minuscules)
  const user = await User.findOne({
    where: { email: email.toLowerCase().trim() },
  });

  // Message d'erreur volontairement générique pour éviter l'énumération de comptes
  if (!user) {
    throw new Error('Identifiants incorrects.');
  }

  // Vérification que le compte n'a pas été désactivé par un administrateur
  if (!user.isActive) {
    throw new Error('Ce compte a été désactivé. Veuillez contacter l\'administration.');
  }

  // Comparaison du mot de passe soumis avec le hash stocké
  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error('Identifiants incorrects.');
  }

  // Construction du payload JWT avec les données nécessaires aux microservices
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    campusId: user.campusId ?? undefined,
  };

  // Génération des deux tokens
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(user.id);

  // Persistence du refresh token haché en base (jamais le token brut)
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    deviceInfo: deviceInfo ?? null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  // Mise à jour de la date de dernière connexion
  await user.update({ lastLoginAt: new Date() });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      campusId: user.campusId ?? undefined,
    },
  };
}

/**
 * Renouvelle l'access token à partir d'un refresh token valide.
 * Applique la rotation des tokens : l'ancien refresh token est révoqué
 * et un nouveau est émis pour limiter la fenêtre d'attaque en cas de vol.
 *
 * @param rawRefreshToken - Le refresh token brut envoyé par le client
 * @returns Un nouvel access token et un nouveau refresh token
 * @throws Error si le token est invalide, révoqué ou expiré
 */
export async function refreshTokens(rawRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // Vérification cryptographique du refresh token (signature + expiration)
  const decoded = verifyRefreshToken(rawRefreshToken);
  if (!decoded) {
    throw new Error('Refresh token invalide ou expiré.');
  }

  // Recherche du token haché en base pour s'assurer qu'il n'a pas été révoqué
  const tokenRecord = await RefreshToken.findOne({
    where: {
      tokenHash: hashToken(rawRefreshToken),
      revokedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
  });

  if (!tokenRecord) {
    throw new Error('Refresh token révoqué ou introuvable.');
  }

  // Récupération de l'utilisateur pour reconstruire le payload à jour
  const user = await User.findByPk(decoded.id);
  if (!user || !user.isActive) {
    throw new Error('Utilisateur introuvable ou inactif.');
  }

  // Révocation de l'ancien refresh token (rotation)
  await tokenRecord.update({ revokedAt: new Date() });

  // Génération d'un nouveau jeu de tokens
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    campusId: user.campusId ?? undefined,
  };

  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(user.id);

  // Persistence du nouveau refresh token
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(newRefreshToken),
    deviceInfo: tokenRecord.deviceInfo,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Révoque le refresh token fourni (déconnexion de la session courante).
 *
 * @param rawRefreshToken - Le refresh token à révoquer
 * @throws Error si le token est introuvable
 */
export async function logout(rawRefreshToken: string): Promise<void> {
  const updated = await RefreshToken.update(
    { revokedAt: new Date() },
    {
      where: {
        tokenHash: hashToken(rawRefreshToken),
        revokedAt: null,
      },
    }
  );

  if (updated[0] === 0) {
    throw new Error('Token introuvable ou déjà révoqué.');
  }
}

/**
 * Révoque toutes les sessions actives d'un utilisateur (déconnexion globale).
 * Utile en cas de compromission de compte ou de changement de mot de passe.
 *
 * @param userId - L'identifiant UUID de l'utilisateur
 */
export async function logoutAll(userId: string): Promise<void> {
  await RefreshToken.update(
    { revokedAt: new Date() },
    {
      where: {
        userId,
        revokedAt: null,
      },
    }
  );
}

/**
 * Retourne la liste des sessions actives d'un utilisateur.
 * Utilisé par l'endpoint GET /auth/sessions pour la gestion des appareils.
 *
 * @param userId - L'identifiant UUID de l'utilisateur
 * @returns Liste des sessions avec leurs métadonnées (sans le token haché)
 */
export async function getActiveSessions(userId: string): Promise<
  Array<{
    id: string;
    deviceInfo: object | null;
    createdAt: Date;
    expiresAt: Date;
  }>
> {
  const sessions = await RefreshToken.findAll({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { [Op.gt]: new Date() },
    },
    attributes: ['id', 'deviceInfo', 'createdAt', 'expiresAt'],
    order: [['createdAt', 'DESC']],
  });

  return sessions.map((s) => ({
    id: s.id,
    deviceInfo: s.deviceInfo,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  }));
}

/**
 * Change le mot de passe d'un utilisateur après vérification du mot de passe actuel.
 * Révoque toutes les sessions existantes après la modification pour forcer
 * une reconnexion sur tous les appareils.
 *
 * @param userId - L'identifiant UUID de l'utilisateur
 * @param currentPassword - Le mot de passe actuel pour vérification
 * @param newPassword - Le nouveau mot de passe souhaité
 * @throws Error si le mot de passe actuel est incorrect ou si le nouveau est trop faible
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('Utilisateur introuvable.');
  }

  // Vérification du mot de passe actuel
  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new Error('Le mot de passe actuel est incorrect.');
  }

  // Validation de la robustesse du nouveau mot de passe
  if (!isStrongPassword(newPassword)) {
    throw new Error(
      'Le nouveau mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.'
    );
  }

  // Mise à jour du hash en base
  const newHash = await hashPassword(newPassword);
  await user.update({ passwordHash: newHash });

  // Révocation de toutes les sessions pour forcer une reconnexion sécurisée
  await logoutAll(userId);
}
