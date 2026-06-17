/**
 * models/academicRecord.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `academic_records`.
 *
 * Un AcademicRecord est créé une fois par an par le jury pour
 * valider ou non le passage d'un étudiant en année supérieure.
 *
 * Il constitue l'historique officiel du parcours académique :
 *   – consulté par l'étudiant (mes historiques)
 *   – consulté par l'enseignant (profil étudiant)
 *   – agrégé par le reporting-service (taux de réussite)
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { AcademicRecordResult } from '../types';

interface AcademicRecordAttributes {
  id: string;
  studentId: string;
  programId: string;
  academicYear: number;
  yearInProgram: number;
  result: AcademicRecordResult;
  gpa: number | null;
  juryComment: string | null;
  validatedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AcademicRecordCreationAttributes
  extends Optional<
    AcademicRecordAttributes,
    'id' | 'gpa' | 'juryComment' | 'validatedAt'
  > {}

class AcademicRecord
  extends Model<AcademicRecordAttributes, AcademicRecordCreationAttributes>
  implements AcademicRecordAttributes
{
  public id!: string;
  public studentId!: string;
  public programId!: string;
  public academicYear!: number;
  public yearInProgram!: number;
  public result!: AcademicRecordResult;
  public gpa!: number | null;
  public juryComment!: string | null;
  public validatedAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AcademicRecord.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    studentId: {
      // UUID de l'étudiant (issu de l'auth-service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    programId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'programs', key: 'id' },
      onDelete: 'RESTRICT',
    },
    academicYear: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    yearInProgram: {
      // Année dans le programme : 1, 2, 3
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    result: {
      type: DataTypes.ENUM('validated', 'failed', 'deferred'),
      allowNull: false,
    },
    gpa: {
      // Moyenne générale annuelle calculée sur l'ensemble des cours
      type: DataTypes.DECIMAL(4, 2),
      allowNull: true,
      defaultValue: null,
    },
    juryComment: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    validatedAt: {
      // Date de la décision du jury
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'academic_records',
    timestamps: true,
    indexes: [
      { fields: ['studentId'] },
      // Un seul bilan par étudiant par année académique
      {
        unique: true,
        fields: ['studentId', 'academicYear'],
        name: 'unique_record_per_year',
      },
    ],
  }
);

export default AcademicRecord;
