/**
 * models/instructor.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `instructors`.
 *
 * Ce profil étend le compte User de l'auth-service (1:1 via userId).
 * Il centralise les données RH de l'enseignant : département,
 * spécialisation, type de contrat, grade académique.
 *
 * Données ajoutées par rapport au fichier Excel d'origine :
 *   – contractType : CDI, vacataire, freelance (manquait dans Excel)
 *   – grade        : Professeur, MCF, ATER… (manquait dans Excel)
 *   – Phone        : int64 → VARCHAR format E.164
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { ContractType } from '../types';

interface InstructorAttributes {
  id: string;
  userId: string;
  campusId: string;
  department: string | null;
  specialization: string | null;
  contractType: ContractType;
  grade: string | null;
  phone: string | null;
  hireDate: Date | null;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

interface InstructorCreationAttributes
  extends Optional<
    InstructorAttributes,
    | 'id'
    | 'department'
    | 'specialization'
    | 'grade'
    | 'phone'
    | 'hireDate'
    | 'status'
  > {}

class Instructor
  extends Model<InstructorAttributes, InstructorCreationAttributes>
  implements InstructorAttributes
{
  public id!: string;
  public userId!: string;
  public campusId!: string;
  public department!: string | null;
  public specialization!: string | null;
  public contractType!: ContractType;
  public grade!: string | null;
  public phone!: string | null;
  public hireDate!: Date | null;
  public status!: 'active' | 'inactive';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Instructor.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    userId: {
      // Référence 1:1 vers le compte User de l'auth-service
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    campusId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING(80),
      allowNull: true,
      defaultValue: null,
    },
    specialization: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: null,
    },
    contractType: {
      // Ajout par rapport à l'Excel : nécessaire pour la gestion RH
      type: DataTypes.ENUM('permanent', 'visiting', 'freelance'),
      allowNull: false,
      defaultValue: 'permanent',
    },
    grade: {
      // Ex : Professeur des universités, Maître de conférences, ATER
      type: DataTypes.STRING(60),
      allowNull: true,
      defaultValue: null,
    },
    phone: {
      // Corrigé : int64 → VARCHAR format E.164
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    hireDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    tableName: 'instructors',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId'] },
      { fields: ['campusId'] },
      { fields: ['department'] },
    ],
  }
);

export default Instructor;
