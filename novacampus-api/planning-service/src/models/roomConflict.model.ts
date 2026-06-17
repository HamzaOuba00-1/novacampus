/**
 * models/roomConflict.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `room_conflicts`.
 *
 * Un conflit est détecté automatiquement lors de la création ou
 * modification d'un créneau (Schedule) quand deux cours occupent
 * la même salle au même créneau horaire.
 *
 * L'administrateur peut ensuite :
 *   – Résoudre le conflit (en modifiant l'un des créneaux)
 *   – Ignorer le conflit (cas particuliers validés manuellement)
 *
 * scheduleAId et scheduleBId représentent les deux créneaux en
 * collision. scheduleAId est toujours celui créé en dernier
 * (l'entrant qui provoque le conflit).
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { ConflictStatus } from '../types';

interface RoomConflictAttributes {
  id: string;
  roomId: string;
  scheduleAId: string;
  scheduleBId: string;
  conflictDate: string | null;
  status: ConflictStatus;
  resolvedBy: string | null;
  detectedAt?: Date;
  resolvedAt: Date | null;
}

interface RoomConflictCreationAttributes
  extends Optional<
    RoomConflictAttributes,
    'id' | 'conflictDate' | 'status' | 'resolvedBy' | 'resolvedAt'
  > {}

class RoomConflict
  extends Model<RoomConflictAttributes, RoomConflictCreationAttributes>
  implements RoomConflictAttributes
{
  public id!: string;
  public roomId!: string;
  public scheduleAId!: string;
  public scheduleBId!: string;
  public conflictDate!: string | null;
  public status!: ConflictStatus;
  public resolvedBy!: string | null;
  public readonly detectedAt!: Date;
  public resolvedAt!: Date | null;
}

RoomConflict.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'rooms', key: 'id' },
    },
    scheduleAId: {
      // Créneau entrant (déclencheur du conflit)
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'schedules', key: 'id' },
    },
    scheduleBId: {
      // Créneau existant avec lequel il y a collision
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'schedules', key: 'id' },
    },
    conflictDate: {
      // Null si conflit récurrent, date précise si conflit ponctuel
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('open', 'resolved', 'ignored'),
      allowNull: false,
      defaultValue: 'open',
    },
    resolvedBy: {
      // UUID de l'administrateur ayant résolu le conflit
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'room_conflicts',
    timestamps: true,
    createdAt: 'detectedAt',
    updatedAt: false,
    indexes: [
      { fields: ['roomId'] },
      { fields: ['status'] },
    ],
  }
);

export default RoomConflict;
