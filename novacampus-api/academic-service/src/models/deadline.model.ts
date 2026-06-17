/**
 * models/deadline.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `deadlines`.
 *
 * Une deadline est créée par un enseignant pour un cours.
 * Elle est visible par tous les étudiants inscrits à ce cours.
 *
 * Déclencheurs de notification :
 *   – Création   : notification immédiate à tous les étudiants inscrits
 *   – Modification du champ dueAt : notification "changement de deadline"
 *   – J-3 et J-1 : rappel automatique programmé
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { DeadlineType } from '../types';

interface DeadlineAttributes {
  id: string;
  courseId: string;
  createdBy: string;
  title: string;
  description: string | null;
  dueAt: Date;
  type: DeadlineType;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DeadlineCreationAttributes
  extends Optional<DeadlineAttributes, 'id' | 'description'> {}

class Deadline
  extends Model<DeadlineAttributes, DeadlineCreationAttributes>
  implements DeadlineAttributes
{
  public id!: string;
  public courseId!: string;
  public createdBy!: string;
  public title!: string;
  public description!: string | null;
  public dueAt!: Date;
  public type!: DeadlineType;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Deadline.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
      onDelete: 'CASCADE',
    },
    createdBy: {
      // UUID de l'enseignant créateur (issu de l'auth-service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    dueAt: {
      // Date et heure limite – la modification de ce champ déclenche une notification
      type: DataTypes.DATE,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('homework', 'project', 'exam', 'other'),
      allowNull: false,
      defaultValue: 'homework',
    },
  },
  {
    sequelize,
    tableName: 'deadlines',
    timestamps: true,
    indexes: [
      { fields: ['courseId'] },
      // Index sur dueAt pour les requêtes "deadlines à venir"
      { fields: ['dueAt'] },
    ],
  }
);

export default Deadline;
