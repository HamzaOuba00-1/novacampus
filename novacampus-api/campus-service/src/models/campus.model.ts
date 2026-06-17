/**
 * models/campus.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `campuses`.
 *
 * C'est l'entité racine de tout le système : tous les autres
 * services référencent les campus via leur campusId (UUID).
 *
 * Ce service est l'unique source de vérité pour les données
 * des campus. Les autres microservices stockent uniquement
 * l'UUID campusId sans dupliquer les métadonnées.
 *
 * Corrections appliquées par rapport au fichier Excel :
 *   – Phone       : int64 → VARCHAR(20) format E.164
 *   – Postal_Code : int64 → CHAR(5)
 *   – Director    : nom texte → directorUserId UUID (FK auth-service)
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { CampusStatus } from '../types';

interface CampusAttributes {
  id: string;
  code: string;
  name: string;
  city: string;
  region: string | null;
  address: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  directorUserId: string | null;
  capacityStudents: number;
  openingDate: Date | null;
  status: CampusStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CampusCreationAttributes
  extends Optional<
    CampusAttributes,
    | 'id'
    | 'region'
    | 'address'
    | 'postalCode'
    | 'phone'
    | 'email'
    | 'directorUserId'
    | 'openingDate'
    | 'status'
  > {}

class Campus
  extends Model<CampusAttributes, CampusCreationAttributes>
  implements CampusAttributes
{
  public id!: string;
  public code!: string;
  public name!: string;
  public city!: string;
  public region!: string | null;
  public address!: string | null;
  public postalCode!: string | null;
  public phone!: string | null;
  public email!: string | null;
  public directorUserId!: string | null;
  public capacityStudents!: number;
  public openingDate!: Date | null;
  public status!: CampusStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Campus.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    code: {
      // Code métier unique : CAMP001, CAMP002…
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING(80),
      allowNull: true,
      defaultValue: null,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    postalCode: {
      // CORRIGÉ : int64 → CHAR(5) pour conserver le zéro initial
      type: DataTypes.CHAR(5),
      allowNull: true,
      defaultValue: null,
    },
    phone: {
      // CORRIGÉ : int64 → VARCHAR format E.164
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: true,
      defaultValue: null,
    },
    directorUserId: {
      // CORRIGÉ : nom texte → UUID référençant l'auth-service
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    capacityStudents: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
    },
    openingDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'archived'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    tableName: 'campuses',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['status'] },
      { fields: ['city'] },
    ],
  }
);

export default Campus;
