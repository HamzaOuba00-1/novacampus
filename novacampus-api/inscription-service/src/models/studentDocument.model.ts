/**
 * models/studentDocument.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `student_documents`.
 *
 * Chaque document est une pièce justificative du dossier étudiant :
 * carte d'identité, diplôme précédent, photo d'identité, etc.
 *
 * Cycle de vie d'un document :
 *   1. Upload par l'étudiant ou l'administration → status: 'pending'
 *   2. Vérification par l'administration  → status: 'verified' ou 'rejected'
 *   3. En cas de rejet : possibilité de re-uploader
 *
 * storageUrl pointe vers le fichier local (dev) ou S3/MinIO (prod).
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { DocumentType, DocumentVerificationStatus } from '../types';

interface StudentDocumentAttributes {
  id: string;
  studentId: string;
  uploadedBy: string;
  type: DocumentType;
  label: string;
  storageUrl: string;
  fileSizeKb: number | null;
  verificationStatus: DocumentVerificationStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectionReason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StudentDocumentCreationAttributes
  extends Optional<
    StudentDocumentAttributes,
    | 'id'
    | 'fileSizeKb'
    | 'verificationStatus'
    | 'verifiedBy'
    | 'verifiedAt'
    | 'rejectionReason'
  > {}

class StudentDocument
  extends Model<StudentDocumentAttributes, StudentDocumentCreationAttributes>
  implements StudentDocumentAttributes
{
  public id!: string;
  public studentId!: string;
  public uploadedBy!: string;
  public type!: DocumentType;
  public label!: string;
  public storageUrl!: string;
  public fileSizeKb!: number | null;
  public verificationStatus!: DocumentVerificationStatus;
  public verifiedBy!: string | null;
  public verifiedAt!: Date | null;
  public rejectionReason!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudentDocument.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'students', key: 'id' },
      onDelete: 'CASCADE',
    },
    uploadedBy: {
      // UUID de l'utilisateur ayant uploadé (étudiant ou admin)
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'id_card',
        'diploma',
        'photo',
        'proof_of_address',
        'health_certificate',
        'other'
      ),
      allowNull: false,
    },
    label: {
      // Libellé affiché : "Carte Nationale d'Identité", "Baccalauréat 2022"…
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    storageUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fileSizeKb: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    verificationStatus: {
      type: DataTypes.ENUM('pending', 'verified', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    verifiedBy: {
      // UUID de l'administrateur ayant vérifié le document
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    rejectionReason: {
      // Motif de rejet affiché à l'étudiant
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'student_documents',
    timestamps: true,
    indexes: [
      { fields: ['studentId'] },
      { fields: ['verificationStatus'] },
    ],
  }
);

export default StudentDocument;
