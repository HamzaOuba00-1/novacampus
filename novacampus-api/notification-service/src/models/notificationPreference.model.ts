/**
 * models/notificationPreference.model.ts
 * ---------------------------------------------------------------
 * Préférences de notification par utilisateur et par type.
 *
 * Permet à chaque utilisateur de choisir :
 *   – Quels types d'événements le notifient
 *   – Via quel(s) canal(aux) il veut être notifié
 *
 * Clé primaire composite (userId + notifType) garantit une
 * seule préférence par utilisateur et par type d'événement.
 *
 * Si aucune préférence n'existe pour un utilisateur, les
 * valeurs par défaut du service s'appliquent.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.config';
import { NotificationType } from '../types';

interface NotificationPreferenceAttributes {
  userId: string;
  notifType: NotificationType;
  pushEnabled: boolean;
  emailEnabled: boolean;
  websocketEnabled: boolean;
  smsEnabled: boolean;
  updatedAt?: Date;
}

interface NotificationPreferenceCreationAttributes
  extends Optional<
    NotificationPreferenceAttributes,
    'pushEnabled' | 'emailEnabled' | 'websocketEnabled' | 'smsEnabled'
  > {}

class NotificationPreference
  extends Model<
    NotificationPreferenceAttributes,
    NotificationPreferenceCreationAttributes
  >
  implements NotificationPreferenceAttributes
{
  public userId!: string;
  public notifType!: NotificationType;
  public pushEnabled!: boolean;
  public emailEnabled!: boolean;
  public websocketEnabled!: boolean;
  public smsEnabled!: boolean;
  public readonly updatedAt!: Date;
}

NotificationPreference.init(
  {
    userId: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    notifType: {
      type: DataTypes.ENUM(
        'schedule_change', 'schedule_cancelled',
        'grade_added', 'grade_updated',
        'absence_recorded',
        'deadline_created', 'deadline_updated',
        'payment_reminder', 'payment_received', 'payment_overdue',
        'ai_alert', 'account_activated', 'document_verified', 'system'
      ),
      primaryKey: true,
    },
    pushEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    emailEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    websocketEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    smsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'notification_preferences',
    timestamps: true,
    createdAt: false,
    indexes: [{ fields: ['userId'] }],
  }
);

export default NotificationPreference;
