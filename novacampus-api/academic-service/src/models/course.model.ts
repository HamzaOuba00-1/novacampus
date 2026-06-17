/**
 * models/course.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `courses`.
 *
 * Un cours appartient à un programme et est dispensé par
 * un ou plusieurs enseignants (table de liaison CourseInstructor).
 *
 * La salle (Room) est gérée dans le planning-service, pas ici.
 * Ce modèle ne stocke que le contenu pédagogique.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { CourseStatus } from '../types';

interface CourseAttributes {
  id: string;
  programId: string;
  leadInstructorId: string | null;
  code: string;
  name: string;
  semester: number;
  credits: number;
  hoursTotal: number;
  description: string | null;
  status: CourseStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CourseCreationAttributes
  extends Optional<
    CourseAttributes,
    'id' | 'leadInstructorId' | 'description' | 'status'
  > {}

class Course
  extends Model<CourseAttributes, CourseCreationAttributes>
  implements CourseAttributes
{
  public id!: string;
  public programId!: string;
  public leadInstructorId!: string | null;
  public code!: string;
  public name!: string;
  public semester!: number;
  public credits!: number;
  public hoursTotal!: number;
  public description!: string | null;
  public status!: CourseStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Course.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    programId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'programs', key: 'id' },
      onDelete: 'RESTRICT',
    },
    leadInstructorId: {
      // Enseignant responsable principal du cours (UUID de l'auth-service)
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    code: {
      // Code métier unique : COM101, INFO301…
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    semester: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: { min: 1, max: 6 },
    },
    credits: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    hoursTotal: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    status: {
      type: DataTypes.ENUM('active', 'archived'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    tableName: 'courses',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['code'] },
      { fields: ['programId'] },
      { fields: ['status'] },
    ],
  }
);

export default Course;
