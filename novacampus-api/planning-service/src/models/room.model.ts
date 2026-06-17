/**
 * models/room.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `rooms`.
 *
 * Une salle est rattachée à un campus et possède une capacité,
 * un type (amphi, TD, labo…) et un statut.
 *
 * Les équipements sont gérés dans la table `room_equipment`
 * (relation N:N) pour remplacer le champ texte libre du fichier Excel.
 *
 * campusId provient de l'auth-service – pas de FK cross-service en DB.
 * ---------------------------------------------------------------
 */
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { RoomType, RoomStatus } from '../types';

// ---------------------------------------------------------------
// Interface décrivant tous les attributs de l'entité Room
// Exportée pour permettre le typage fort dans les services
// ---------------------------------------------------------------
export interface RoomAttributes {
  id: string;
  campusId: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  type: RoomType;
  status: RoomStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

// ---------------------------------------------------------------
// Attributs optionnels lors de la création
// Optional<> supprimé car non exporté par Sequelize v6+
// On utilise Omit + réinjection des champs optionnels à la place
// ---------------------------------------------------------------
type RoomCreationAttributes = Omit<RoomAttributes, 'id' | 'floor' | 'status'> & {
  id?: string;
  floor?: number;
  status?: RoomStatus;
};

// ---------------------------------------------------------------
// Classe du modèle avec typage fort via les génériques Sequelize
// ---------------------------------------------------------------
class Room
  extends Model<RoomAttributes, RoomCreationAttributes>
  implements RoomAttributes
{
  public id!: string;
  public campusId!: string;
  public code!: string;
  public name!: string;
  public building!: string;
  public floor!: number;
  public capacity!: number;
  public type!: RoomType;
  public status!: RoomStatus;

  // Timestamps gérés automatiquement par Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Room.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    campusId: {
      // UUID du campus issu de l'auth-service
      // Pas de FK cross-service en DB : contrainte gérée applicativement
      type: DataTypes.UUID,
      allowNull: false,
    },
    code: {
      // Code métier unique : ROOM101, LAB-A3…
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    building: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    floor: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
    },
    capacity: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('amphitheater', 'td', 'lab', 'seminar'),
      allowNull: false,
      defaultValue: 'td',
    },
    status: {
      // available : utilisable normalement
      // maintenance : temporairement indisponible
      // closed : fermée définitivement
      type: DataTypes.ENUM('available', 'maintenance', 'closed'),
      allowNull: false,
      defaultValue: 'available',
    },
  },
  {
    sequelize,
    tableName: 'rooms',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['campusId'] },
      { fields: ['status'] },
    ],
  }
);

export default Room;