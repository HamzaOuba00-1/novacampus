/**
 * models/program.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `programs`.
 *
 * Un programme (filière) est rattaché à un campus.
 * Il regroupe plusieurs cours et définit la durée, les frais
 * de scolarité et le département responsable.
 *
 * Relation :
 *   Campus (auth-service) 1 ──< Program >── Course 1..N
 *
 * Note : campusId et coordinatorId sont des UUID provenant de
 * l'auth-service. Ce service ne connaît pas ces entités
 * directement – les jointures cross-service se font via API.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { ProgramType } from '../types';

interface ProgramAttributes {
  id: string;
  campusId: string;
  coordinatorId: string | null;
  name: string;
  type: ProgramType;
  department: string | null;
  durationYears: number;
  annualTuition: number;
  maxStudents: number;
  status: 'active' | 'archived';
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProgramCreationAttributes
  extends Optional<
    ProgramAttributes,
    'id' | 'coordinatorId' | 'department' | 'status'
  > {}

class Program
  extends Model<ProgramAttributes, ProgramCreationAttributes>
  implements ProgramAttributes
{
  public id!: string;
  public campusId!: string;
  public coordinatorId!: string | null;
  public name!: string;
  public type!: ProgramType;
  public department!: string | null;
  public durationYears!: number;
  public annualTuition!: number;
  public maxStudents!: number;
  public status!: 'active' | 'archived';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Program.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    campusId: {
      // UUID du campus issu de l'auth-service (pas de FK cross-service en DB)
      type: DataTypes.UUID,
      allowNull: false,
    },
    coordinatorId: {
      // UUID de l'enseignant coordinateur (issu de l'auth-service)
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('bachelor', 'master', 'other'),
      allowNull: false,
      defaultValue: 'bachelor',
    },
    department: {
      type: DataTypes.STRING(80),
      allowNull: true,
      defaultValue: null,
    },
    durationYears: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    annualTuition: {
      // DECIMAL pour éviter les erreurs d'arrondi des floats (montants financiers)
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    maxStudents: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'archived'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    tableName: 'programs',
    timestamps: true,
    indexes: [{ fields: ['campusId'] }, { fields: ['status'] }],
  }
);

export default Program;
