/**
 * models/roomEquipment.model.ts
 * ---------------------------------------------------------------
 * Table de liaison Room ↔ équipements.
 *
 * Remplace le champ texte libre "Projecteur, Tableau…" du fichier
 * Excel par une table structurée permettant les filtres de recherche
 * (ex : "trouver toutes les salles avec GPU disponible").
 *
 * Clé primaire composite (roomId + equipmentType) pour garantir
 * l'unicité de chaque type d'équipement par salle.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.config';
import { EquipmentType } from '../types';

interface RoomEquipmentAttributes {
  roomId: string;
  equipmentType: EquipmentType;
  quantity: number;
}

interface RoomEquipmentCreationAttributes
  extends Optional<RoomEquipmentAttributes, 'quantity'> {}

class RoomEquipment
  extends Model<RoomEquipmentAttributes, RoomEquipmentCreationAttributes>
  implements RoomEquipmentAttributes
{
  public roomId!: string;
  public equipmentType!: EquipmentType;
  public quantity!: number;
}

RoomEquipment.init(
  {
    roomId: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: { model: 'rooms', key: 'id' },
      onDelete: 'CASCADE',
    },
    equipmentType: {
      type: DataTypes.ENUM('projector', 'whiteboard', 'pc', 'gpu', 'audio'),
      primaryKey: true,
    },
    quantity: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'room_equipment',
    timestamps: false,
  }
);

export default RoomEquipment;
