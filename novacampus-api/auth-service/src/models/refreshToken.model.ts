/**
 * models/refreshToken.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `refresh_tokens`.
 *
 * Les refresh tokens permettent de renouveler les access tokens
 * (durée courte : 15 min) sans redemander les identifiants.
 *
 * Mécanisme de sécurité :
 *   – Chaque token est haché en SHA-256 avant stockage
 *   – La révocation est possible unitairement (logout) ou totale
 *     (logout-all) via la colonne revokedAt
 *   – La colonne expiresAt permet un nettoyage périodique des tokens expirés
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';

// ---------------------------------------------------------------
// Interface décrivant tous les attributs du RefreshToken
// ---------------------------------------------------------------
interface RefreshTokenAttributes {
  id: string;
  userId: string;
  tokenHash: string;
  deviceInfo: object | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt?: Date;
}

// ---------------------------------------------------------------
// Attributs optionnels lors de la création
// ---------------------------------------------------------------
interface RefreshTokenCreationAttributes
  extends Optional<RefreshTokenAttributes, 'id' | 'deviceInfo' | 'revokedAt'> {}

// ---------------------------------------------------------------
// Classe du modèle RefreshToken
// ---------------------------------------------------------------
class RefreshToken
  extends Model<RefreshTokenAttributes, RefreshTokenCreationAttributes>
  implements RefreshTokenAttributes
{
  public id!: string;
  public userId!: string;
  public tokenHash!: string;
  public deviceInfo!: object | null;
  public expiresAt!: Date;
  public revokedAt!: Date | null;
  public readonly createdAt!: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    userId: {
      // Référence vers l'utilisateur propriétaire du token
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    tokenHash: {
      // Hash SHA-256 du refresh token – le token brut n'est jamais stocké
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    deviceInfo: {
      // Informations sur l'appareil de connexion (User-Agent, IP, OS)
      // Stocké en JSONB pour flexibilité et lisibilité côté administration
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    expiresAt: {
      // Date d'expiration naturelle du token (ex : maintenant + 7 jours)
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      // NULL = token encore valide. Renseigné lors d'un logout explicite.
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'refresh_tokens',
    // Seul createdAt est utile ici ; updatedAt n'a pas de sens sur un token
    timestamps: true,
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['tokenHash'] },
      // Index sur userId pour accélérer le logout-all et la liste des sessions
      { fields: ['userId'] },
    ],
  }
);

export default RefreshToken;
