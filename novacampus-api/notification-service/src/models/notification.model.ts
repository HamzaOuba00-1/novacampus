/**
 * models/notification.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `notifications`.
 *
 * Chaque notification est persistée en base pour :
 *   – Permettre la consultation de l'historique (cloche de notif)
 *   – Savoir si une notification a été lue (isRead / readAt)
 *   – Relivrer une notification si l'utilisateur était hors ligne
 *   – Alimenter les métriques (taux d'ouverture, temps de lecture)
 *
 * refType + refId permettent un lien polymorphe vers l'entité
 * source (ex : refType='Schedule', refId='uuid-du-creneau').
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { NotificationType, NotificationChannel } from '../types';

interface NotificationAttributes {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  channel: NotificationChannel;
  refType: string | null;
  refId: string | null;
  isRead: boolean;
  sentAt: Date;
  readAt: Date | null;
  createdAt?: Date;
}

interface NotificationCreationAttributes
  extends Optional<
    NotificationAttributes,
    'id' | 'refType' | 'refId' | 'isRead' | 'readAt'
  > {}

class Notification
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  public id!: string;
  public userId!: string;
  public type!: NotificationType;
  public title!: string;
  public body!: string;
  public channel!: NotificationChannel;
  public refType!: string | null;
  public refId!: string | null;
  public isRead!: boolean;
  public sentAt!: Date;
  public readAt!: Date | null;
  public readonly createdAt!: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    userId: {
      // UUID de l'utilisateur destinataire (issu de l'auth-service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        'schedule_change',
        'schedule_cancelled',
        'grade_added',
        'grade_updated',
        'absence_recorded',
        'deadline_created',
        'deadline_updated',
        'payment_reminder',
        'payment_received',
        'payment_overdue',
        'ai_alert',
        'account_activated',
        'document_verified',
        'system'
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM('push', 'email', 'websocket', 'sms'),
      allowNull: false,
    },
    refType: {
      // Nom du modèle source : 'Schedule', 'Invoice', 'Deadline'…
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: null,
    },
    refId: {
      // UUID de l'entité source permettant un lien direct dans l'UI
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    updatedAt: false,
    indexes: [
      // Index principal : notifications d'un utilisateur triées par date
      { fields: ['userId', 'sentAt'] },
      { fields: ['userId', 'isRead'] },
      { fields: ['type'] },
      { fields: ['refType', 'refId'] },
    ],
  }
);

export default Notification;
