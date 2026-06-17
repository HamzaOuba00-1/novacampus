/**
 * models/user.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `users` en base de données.
 *
 * Ce modèle est la source de vérité pour le schéma de la table.
 * Il centralise :
 *   – les colonnes et leurs types
 *   – les contraintes (unicité, non-nullité, validation de format)
 *   – la gestion automatique des timestamps (createdAt / updatedAt)
 *
 * Note : le mot de passe n'est JAMAIS retourné dans les sélections
 * par défaut grâce à l'option `select: false` appliquée côté service.
 * ---------------------------------------------------------------
 */
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { UserRole } from '../types';

// ---------------------------------------------------------------
// Interface décrivant tous les attributs de l'entité User
// Exportée pour permettre le typage fort dans les services (WhereOptions)
// ---------------------------------------------------------------
export interface UserAttributes {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  campusId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// ---------------------------------------------------------------
// Attributs optionnels lors de la création (id généré automatiquement)
// Optional<> supprimé car non exporté par Sequelize v6+
// On utilise Omit + réinjection des champs optionnels à la place
// ---------------------------------------------------------------
type UserCreationAttributes = Omit<
  UserAttributes,
  'id' | 'isActive' | 'lastLoginAt' | 'campusId'
> & {
  id?: string;
  isActive?: boolean;
  lastLoginAt?: Date | null;
  campusId?: string | null;
};

// ---------------------------------------------------------------
// Classe du modèle avec typage fort via les génériques Sequelize
// ---------------------------------------------------------------
class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public email!: string;
  public passwordHash!: string;
  public role!: UserRole;
  public campusId!: string | null;
  public isActive!: boolean;
  public lastLoginAt!: Date | null;

  // Timestamps gérés automatiquement par Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    passwordHash: {
      // Stockage du hash bcrypt uniquement – jamais le mot de passe en clair
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('student', 'instructor', 'admin', 'direction'),
      allowNull: false,
      defaultValue: 'student',
    },
    campusId: {
      // Référence vers le campus principal de l'utilisateur
      // NULL autorisé pour les comptes de direction multi-campus
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    isActive: {
      // Permet de désactiver un compte sans le supprimer (soft disable)
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastLoginAt: {
      // Mis à jour à chaque connexion réussie pour le suivi de sécurité
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'users',
    // Active la gestion automatique de createdAt et updatedAt
    timestamps: true,
    // Index sur l'email pour accélérer les recherches de connexion
    indexes: [{ unique: true, fields: ['email'] }],
  }
);

export default User;