/**
 * models/exportJob.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `export_jobs`.
 *
 * Les exports de rapports sont traités de façon asynchrone pour
 * ne pas bloquer le thread principal (exports potentiellement
 * volumineux : tous les étudiants d'un campus sur une année).
 *
 * Flux :
 *   1. POST /api/reports/export → crée un ExportJob (pending)
 *      → retourne { jobId, status: 'pending' }
 *   2. Worker calcule l'export en arrière-plan
 *   3. GET /api/reports/export/:jobId → statut + lien de téléchargement
 *
 * En prod, le lien de téléchargement pointe vers un bucket S3.
 * En dev, c'est un chemin local accessible via l'API.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { ExportFormat, ExportStatus } from '../types';

interface ExportJobAttributes {
  id: string;
  requestedBy: string;
  reportType: string;
  format: ExportFormat;
  filters: object;
  status: ExportStatus;
  filePath: string | null;
  rowCount: number | null;
  errorMessage: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ExportJobCreationAttributes
  extends Optional<
    ExportJobAttributes,
    'id' | 'status' | 'filePath' | 'rowCount' | 'errorMessage'
  > {}

class ExportJob
  extends Model<ExportJobAttributes, ExportJobCreationAttributes>
  implements ExportJobAttributes
{
  public id!: string;
  public requestedBy!: string;
  public reportType!: string;
  public format!: ExportFormat;
  public filters!: object;
  public status!: ExportStatus;
  public filePath!: string | null;
  public rowCount!: number | null;
  public errorMessage!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ExportJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    requestedBy: {
      // UUID de l'utilisateur ayant demandé l'export
      type: DataTypes.UUID,
      allowNull: false,
    },
    reportType: {
      // Type de rapport : 'attendance', 'grades', 'revenue', 'ai_alerts'…
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    format: {
      type: DataTypes.ENUM('json', 'csv'),
      allowNull: false,
      defaultValue: 'csv',
    },
    filters: {
      // Paramètres du rapport (campusId, academicYear, etc.) stockés en JSONB
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM('pending', 'ready', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    filePath: {
      // Chemin local ou URL S3 vers le fichier généré
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    rowCount: {
      // Nombre de lignes exportées (utile pour valider l'export)
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    errorMessage: {
      // Message d'erreur si status='failed'
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'export_jobs',
    timestamps: true,
    indexes: [
      { fields: ['requestedBy'] },
      { fields: ['status'] },
      { fields: ['reportType'] },
    ],
  }
);

export default ExportJob;
