/**
 * models/academicYear.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `academic_years`.
 *
 * Table de référence partagée par tous les microservices via
 * l'année entière (SMALLINT) pour éviter la chaîne "2023-2024".
 *
 * Un seul enregistrement peut avoir isCurrent = true à la fois.
 * La contrainte est gérée en service (pas en DB pour la portabilité).
 *
 * Contient les dates précises des deux semestres pour calculer
 * automatiquement le semestre actif et les deadlines.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.config';

interface AcademicYearAttributes {
  year: number;           // Clé primaire : 2023 (pour 2023-2024)
  label: string;          // Libellé affiché : "2023-2024"
  s1Start: Date;
  s1End: Date;
  s2Start: Date;
  s2End: Date;
  isCurrent: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AcademicYearCreationAttributes
  extends Optional<AcademicYearAttributes, 'isCurrent'> {}

class AcademicYear
  extends Model<AcademicYearAttributes, AcademicYearCreationAttributes>
  implements AcademicYearAttributes
{
  public year!: number;
  public label!: string;
  public s1Start!: Date;
  public s1End!: Date;
  public s2Start!: Date;
  public s2End!: Date;
  public isCurrent!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AcademicYear.init(
  {
    year: {
      // Clé primaire entière – CORRIGÉ : au lieu de STRING "2023-2024"
      type: DataTypes.SMALLINT,
      primaryKey: true,
    },
    label: {
      // Libellé calculé automatiquement : "2023-2024"
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    s1Start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    s1End: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    s2Start: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    s2End: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    isCurrent: {
      // Un seul true à la fois – géré en service par transaction
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'academic_years',
    timestamps: true,
    indexes: [
      // Index partiel : un seul isCurrent=true possible rapidement
      { fields: ['isCurrent'] },
    ],
  }
);

export default AcademicYear;
