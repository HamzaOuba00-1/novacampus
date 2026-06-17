/**
 * models/kpiSnapshot.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `kpi_snapshots`.
 *
 * Remplace la table KPI_DASHBOARD statique du fichier Excel
 * par un cache dynamique recalculé périodiquement.
 *
 * Corrections appliquées par rapport à l'Excel :
 *   – Pas de PK → PK composite (campusId + academicYear + semester)
 *   – Données agrégées calculées dynamiquement, pas saisies manuellement
 *   – Tous les montants en DECIMAL(14,2) au lieu de float
 *   – Ajout de computedAt pour savoir quand le cache a été rafraîchi
 *
 * Stratégie de cache :
 *   1. Requête direction → vérifier si snapshot < KPI_CACHE_TTL_MINUTES
 *   2. Si frais → retourner le snapshot
 *   3. Si expiré → recalculer, persister, retourner
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.config';

interface KpiSnapshotAttributes {
  id: string;
  campusId: string;
  academicYear: number;
  semester: number | null;
  totalStudents: number;
  activeStudents: number;
  enrollmentRate: number;
  avgAttendanceRate: number;
  successRate: number;
  totalRevenue: number;
  defaultRate: number;
  roomOccupancyRate: number;
  computedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface KpiSnapshotCreationAttributes
  extends Optional<KpiSnapshotAttributes, 'id' | 'computedAt'> {}

class KpiSnapshotModel
  extends Model<KpiSnapshotAttributes, KpiSnapshotCreationAttributes>
  implements KpiSnapshotAttributes
{
  public id!: string;
  public campusId!: string;
  public academicYear!: number;
  public semester!: number | null;
  public totalStudents!: number;
  public activeStudents!: number;
  public enrollmentRate!: number;
  public avgAttendanceRate!: number;
  public successRate!: number;
  public totalRevenue!: number;
  public defaultRate!: number;
  public roomOccupancyRate!: number;
  public computedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

KpiSnapshotModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    campusId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    academicYear: {
      // CORRIGÉ : SMALLINT au lieu de STRING "2023-2024"
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    semester: {
      // null = snapshot annuel consolidé (S1 + S2)
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    totalStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    activeStudents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    enrollmentRate: {
      // % inscrits / capacité du campus
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    avgAttendanceRate: {
      // % présence moyen de tous les étudiants actifs
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    successRate: {
      // % étudiants ayant validé leur année
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalRevenue: {
      // CORRIGÉ : DECIMAL(14,2) au lieu de float
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    defaultRate: {
      // % factures en retard / total facturé
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    roomOccupancyRate: {
      // % créneaux occupés / créneaux disponibles
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    computedAt: {
      // Date de calcul du snapshot (utilisée pour l'invalidation du cache)
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'kpi_snapshots',
    timestamps: true,
    indexes: [
      // Index composite pour les requêtes de dashboard par campus/année
      {
        unique: true,
        fields: ['campusId', 'academicYear', 'semester'],
        name: 'unique_kpi_snapshot',
      },
      { fields: ['academicYear'] },
      { fields: ['computedAt'] },
    ],
  }
);

export default KpiSnapshotModel;
