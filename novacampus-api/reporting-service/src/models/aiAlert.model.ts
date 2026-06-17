/**
 * models/aiAlert.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `ai_alerts`.
 *
 * Chaque alerte est générée par l'agent IA lors d'une analyse
 * (automatique ou déclenchée manuellement).
 *
 * Cycle de vie d'une alerte :
 *   1. open     → générée, en attente de traitement
 *   2. actioned → traitée par un admin (note possible)
 *   3. dismissed → ignorée avec justification
 *
 * Les alertes student-level permettent d'identifier précisément
 * les étudiants à risque. Les alertes campus-level signalent
 * des anomalies globales (baisse de taux de réussite, etc.).
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { AiAlertType, AiAlertSeverity, AiAlertStatus } from '../types';

interface AiAlertAttributes {
  id: string;
  studentId: string | null;
  campusId: string | null;
  type: AiAlertType;
  severity: AiAlertSeverity;
  score: number;
  factors: object;
  recommendation: string;
  status: AiAlertStatus;
  actionedBy: string | null;
  actionNote: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AiAlertCreationAttributes
  extends Optional<
    AiAlertAttributes,
    'id' | 'studentId' | 'campusId' | 'status' | 'actionedBy' | 'actionNote'
  > {}

class AiAlert
  extends Model<AiAlertAttributes, AiAlertCreationAttributes>
  implements AiAlertAttributes
{
  public id!: string;
  public studentId!: string | null;
  public campusId!: string | null;
  public type!: AiAlertType;
  public severity!: AiAlertSeverity;
  public score!: number;
  public factors!: object;
  public recommendation!: string;
  public status!: AiAlertStatus;
  public actionedBy!: string | null;
  public actionNote!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AiAlert.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    studentId: {
      // UUID de l'étudiant concerné (null si alerte campus-level)
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    campusId: {
      // UUID du campus concerné (null si alerte globale)
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    type: {
      type: DataTypes.ENUM(
        'dropout_risk',
        'payment_risk',
        'low_attendance',
        'room_underuse',
        'campus_anomaly'
      ),
      allowNull: false,
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
    },
    score: {
      // Score de risque normalisé entre 0.000 et 1.000
      type: DataTypes.DECIMAL(4, 3),
      allowNull: false,
      validate: { min: 0, max: 1 },
    },
    factors: {
      // Détail des signaux ayant contribué au score (JSONB)
      // Ex: { attendanceRate: 0.45, gradeAverage: 8.2, daysOverdue: 25 }
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    recommendation: {
      // Texte de recommandation généré par l'agent IA
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'actioned', 'dismissed'),
      allowNull: false,
      defaultValue: 'open',
    },
    actionedBy: {
      // UUID de l'admin ayant traité l'alerte
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    actionNote: {
      // Note laissée par l'admin lors du traitement
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'ai_alerts',
    timestamps: true,
    indexes: [
      { fields: ['studentId'] },
      { fields: ['campusId'] },
      { fields: ['type'] },
      { fields: ['severity'] },
      { fields: ['status'] },
      // Index composite pour le dashboard admin (alertes ouvertes par campus)
      { fields: ['status', 'campusId', 'severity'] },
    ],
  }
);

export default AiAlert;
