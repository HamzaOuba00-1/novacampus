/**
 * models/courseResource.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `course_resources`.
 *
 * Les ressources pédagogiques sont les supports mis à disposition
 * par les enseignants : PDFs, vidéos, liens, présentations…
 *
 * En développement, les fichiers sont stockés localement (./uploads/).
 * En production, storageUrl pointe vers un bucket S3 ou MinIO.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { ResourceType } from '../types';

interface CourseResourceAttributes {
  id: string;
  courseId: string;
  uploadedBy: string;
  title: string;
  type: ResourceType;
  storageUrl: string;
  fileSizeKb: number | null;
  isVisible: boolean;
  createdAt?: Date;
}

interface CourseResourceCreationAttributes
  extends Optional<CourseResourceAttributes, 'id' | 'fileSizeKb' | 'isVisible'> {}

class CourseResource
  extends Model<CourseResourceAttributes, CourseResourceCreationAttributes>
  implements CourseResourceAttributes
{
  public id!: string;
  public courseId!: string;
  public uploadedBy!: string;
  public title!: string;
  public type!: ResourceType;
  public storageUrl!: string;
  public fileSizeKb!: number | null;
  public isVisible!: boolean;
  public readonly createdAt!: Date;
}

CourseResource.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'courses', key: 'id' },
      onDelete: 'CASCADE',
    },
    uploadedBy: {
      // UUID de l'enseignant uploadeur (issu de l'auth-service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('pdf', 'video', 'link', 'other'),
      allowNull: false,
    },
    storageUrl: {
      // Chemin local ou URL S3/MinIO du fichier
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fileSizeKb: {
      // Taille en Ko – null pour les liens externes
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    isVisible: {
      // Permet à l'enseignant de masquer temporairement une ressource
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'course_resources',
    timestamps: true,
    updatedAt: false,
    indexes: [{ fields: ['courseId'] }],
  }
);

export default CourseResource;
