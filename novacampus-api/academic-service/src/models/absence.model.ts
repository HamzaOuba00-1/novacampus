/**
 * models/absence.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `absences`.
 *
 * Chaque enregistrement correspond à une absence ou un retard
 * d'un étudiant pour une séance précise.
 *
 * La saisie est faite par l'enseignant via un appel batch
 * (POST /schedules/:id/absences) couvrant toute la classe.
 *
 * Le taux de présence (attendanceRate) de l'Enrollment associé
 * est recalculé automatiquement après chaque modification.
 *
 * scheduleId est un UUID qui provient du planning-service.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { AbsenceType } from '../types';

interface AbsenceAttributes {
  id: string;
  enrollmentId: string;
  scheduleId: string;
  sessionDate: Date;
  type: AbsenceType;
  justification: string | null;
  recordedBy: string;
  recordedAt?: Date;
}

interface AbsenceCreationAttributes
  extends Optional<AbsenceAttributes, 'id' | 'justification'> {}

class Absence
  extends Model<AbsenceAttributes, AbsenceCreationAttributes>
  implements AbsenceAttributes
{
  public id!: string;
  public enrollmentId!: string;
  public scheduleId!: string;
  public sessionDate!: Date;
  public type!: AbsenceType;
  public justification!: string | null;
  public recordedBy!: string;
  public readonly recordedAt!: Date;
}

Absence.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    enrollmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'enrollments', key: 'id' },
      onDelete: 'CASCADE',
    },
    scheduleId: {
      // UUID du créneau issu du planning-service (pas de FK cross-service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    sessionDate: {
      // Date réelle de la séance manquée
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('absent', 'late', 'justified'),
      allowNull: false,
      defaultValue: 'absent',
    },
    justification: {
      // Motif de justification saisi par l'administration
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    recordedBy: {
      // UUID de l'enseignant ayant enregistré l'absence
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'absences',
    timestamps: true,
    createdAt: 'recordedAt',
    updatedAt: false,
    indexes: [
      { fields: ['enrollmentId'] },
      // Éviter les doublons : un étudiant ne peut être absent qu'une fois par séance
      {
        unique: true,
        fields: ['enrollmentId', 'scheduleId', 'sessionDate'],
        name: 'unique_absence_per_session',
      },
    ],
  }
);

export default Absence;
