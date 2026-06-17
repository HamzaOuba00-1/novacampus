/**
 * models/enrollment.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `enrollments`.
 *
 * Une inscription lie un étudiant à un cours pour une année
 * académique et un semestre donnés.
 *
 * Elle agrège :
 *   – le statut de progression (enrolled → validated/failed)
 *   – la note finale calculée à partir des Grade individuels
 *   – le taux de présence calculé à partir des Absence
 *
 * Les notes détaillées sont dans la table `grades`.
 * Les absences séance par séance sont dans la table `absences`.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { EnrollmentStatus } from '../types';

interface EnrollmentAttributes {
  id: string;
  studentId: string;
  courseId: string;
  academicYear: number;
  semester: number;
  status: EnrollmentStatus;
  finalGrade: number | null;
  attendanceRate: number | null;
  enrolledAt?: Date;
  validatedAt: Date | null;
  updatedAt?: Date;
}

interface EnrollmentCreationAttributes
  extends Optional<
    EnrollmentAttributes,
    'id' | 'status' | 'finalGrade' | 'attendanceRate' | 'validatedAt'
  > {}

class Enrollment
  extends Model<EnrollmentAttributes, EnrollmentCreationAttributes>
  implements EnrollmentAttributes
{
  public id!: string;
  public studentId!: string;
  public courseId!: string;
  public academicYear!: number;
  public semester!: number;
  public status!: EnrollmentStatus;
  public finalGrade!: number | null;
  public attendanceRate!: number | null;
  public validatedAt!: Date | null;
  public readonly enrolledAt!: Date;
  public readonly updatedAt!: Date;
}

Enrollment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    studentId: {
      // UUID de l'étudiant issu de l'auth-service
      type: DataTypes.UUID,
      allowNull: false,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
      onDelete: 'RESTRICT',
    },
    academicYear: {
      // Année de début : 2023 pour l'année 2023-2024
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    semester: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: { min: 1, max: 2 },
    },
    status: {
      type: DataTypes.ENUM('enrolled', 'validated', 'failed', 'withdrawn'),
      allowNull: false,
      defaultValue: 'enrolled',
    },
    finalGrade: {
      // Moyenne calculée sur l'ensemble des Grade – null en cours d'année
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    attendanceRate: {
      // Pourcentage de présence calculé depuis les Absence – null si aucune séance
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
    },
    validatedAt: {
      // Renseigné lors de la décision de jury
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'enrollments',
    timestamps: true,
    createdAt: 'enrolledAt',
    indexes: [
      // Empêcher un étudiant d'être inscrit deux fois au même cours la même année
      {
        unique: true,
        fields: ['studentId', 'courseId', 'academicYear', 'semester'],
        name: 'unique_enrollment',
      },
      { fields: ['studentId'] },
      { fields: ['courseId'] },
    ],
  }
);

export default Enrollment;
