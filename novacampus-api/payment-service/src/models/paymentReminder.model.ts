/**
 * models/paymentReminder.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `payment_reminders`.
 *
 * Remplace le champ texte libre "Notes" de la table PAYMENTS
 * de l'Excel par une table structurée et horodatée permettant :
 *   – De tracer chaque relance (canal, niveau, déclencheur)
 *   – De calculer l'historique des relances par facture
 *   – À l'agent IA de décider intelligemment du niveau suivant
 *   – De générer des rapports sur l'efficacité des relances
 *
 * triggeredBy distingue les relances manuelles (admin),
 * automatiques (cron planifié) et IA (agent).
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { ReminderChannel, ReminderTrigger } from '../types';

interface PaymentReminderAttributes {
  id: string;
  invoiceId: string;
  level: number;
  channel: ReminderChannel;
  triggeredBy: ReminderTrigger;
  contentSnapshot: string | null;
  sentAt: Date;
  createdAt?: Date;
}

interface PaymentReminderCreationAttributes
  extends Optional<PaymentReminderAttributes, 'id' | 'contentSnapshot' | 'sentAt'> {}

class PaymentReminder
  extends Model<PaymentReminderAttributes, PaymentReminderCreationAttributes>
  implements PaymentReminderAttributes
{
  public id!: string;
  public invoiceId!: string;
  public level!: number;
  public channel!: ReminderChannel;
  public triggeredBy!: ReminderTrigger;
  public contentSnapshot!: string | null;
  public sentAt!: Date;
  public readonly createdAt!: Date;
}

PaymentReminder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'invoices', key: 'id' },
      onDelete: 'CASCADE',
    },
    level: {
      // Niveau de relance : 1 = rappel doux, 2 = relance formelle, 3 = mise en demeure
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    channel: {
      type: DataTypes.ENUM('email', 'sms', 'letter'),
      allowNull: false,
      defaultValue: 'email',
    },
    triggeredBy: {
      // Traçabilité du déclencheur pour les audits et l'analyse de l'IA
      type: DataTypes.ENUM('manual', 'ai_agent', 'scheduled'),
      allowNull: false,
      defaultValue: 'manual',
    },
    contentSnapshot: {
      // Copie du corps du message envoyé pour archivage légal
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'payment_reminders',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['invoiceId'] },
      { fields: ['triggeredBy'] },
      { fields: ['sentAt'] },
    ],
  }
);

export default PaymentReminder;
