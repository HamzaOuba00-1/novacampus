/**
 * models/grade.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `grades`.
 *
 * Chaque Grade représente une évaluation individuelle (partiel,
 * projet, oral, TP...) liée à une inscription (Enrollment).
 *
 * La note finale de l'Enrollment est calculée comme la moyenne
 * pondérée de tous ses Grade via le service.
 *
 * Toute création ou modification de Grade déclenche :
 *   1. Le recalcul de finalGrade dans l'Enrollment associé
 *   2. Une notification à l'étudiant (via le notification-service)
 *   3. Une entrée dans l'audit log
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';

interface GradeAttributes {
  id: string;
  enrollmentId: string;
  instructorId: string;
  label: string;
  value: number;
  weight: number;
  comment: string | null;
  gradedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface GradeCreationAttributes
  extends Optional<GradeAttributes, 'id' | 'weight' | 'comment' | 'gradedAt'> {}

class Grade
  extends Model<GradeAttributes, GradeCreationAttributes>
  implements GradeAttributes
{
  public id!: string;
  public enrollmentId!: string;
  public instructorId!: string;
  public label!: string;
  public value!: number;
  public weight!: number;
  public comment!: string | null;
  public gradedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Grade.init(
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
    instructorId: {
      // UUID de l'enseignant ayant saisi la note (issu de l'auth-service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    label: {
      // Libellé de l'évaluation : "Partiel 1", "Projet final", "TP noté"…
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    value: {
      // Note sur 20 – DECIMAL pour éviter les imprécisions de float
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      validate: { min: 0, max: 20 },
    },
    weight: {
      // Coefficient de pondération (défaut 1 = poids normal)
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 1.0,
    },
    comment: {
      // Commentaire de l'enseignant visible par l'étudiant
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    gradedAt: {
      // Date réelle de l'évaluation (peut différer de createdAt)
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'grades',
    timestamps: true,
    indexes: [{ fields: ['enrollmentId'] }],
  }
);

export default Grade;
