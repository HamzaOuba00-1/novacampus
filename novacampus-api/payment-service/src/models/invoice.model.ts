/**
 * models/invoice.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `invoices`.
 *
 * Remplace la table `PAYMENTS` du fichier Excel avec les
 * corrections suivantes :
 *   – Amount : float64 → DECIMAL(10,2) (impératif en comptabilité)
 *   – Academic_Year : STRING "2023-2024" → SMALLINT 2023
 *   – Ajout de program_id et campus_id pour le reporting direct
 *     sans jointure cross-service
 *   – Notes texte libre → table PaymentReminder dédiée
 *
 * Une Invoice représente une obligation de paiement semestrielle
 * ou ponctuelle liée à un étudiant et son programme.
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { InvoiceStatus, PaymentMethod } from '../types';

interface InvoiceAttributes {
  id: string;
  studentId: string;
  programId: string;
  campusId: string;
  academicYear: number;
  semester: number;
  amount: number;
  status: InvoiceStatus;
  invoiceDate: Date;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: PaymentMethod | null;
  reference: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InvoiceCreationAttributes
  extends Optional<
    InvoiceAttributes,
    'id' | 'status' | 'paidAt' | 'paymentMethod' | 'reference'
  > {}

class Invoice
  extends Model<InvoiceAttributes, InvoiceCreationAttributes>
  implements InvoiceAttributes
{
  public id!: string;
  public studentId!: string;
  public programId!: string;
  public campusId!: string;
  public academicYear!: number;
  public semester!: number;
  public amount!: number;
  public status!: InvoiceStatus;
  public invoiceDate!: Date;
  public dueDate!: Date;
  public paidAt!: Date | null;
  public paymentMethod!: PaymentMethod | null;
  public reference!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Invoice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    studentId: {
      // UUID de l'étudiant (issu de l'inscription-service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    programId: {
      // Dénormalisé ici pour le reporting financier sans jointure cross-service
      type: DataTypes.UUID,
      allowNull: false,
    },
    campusId: {
      // Dénormalisé ici pour filtrer les revenus par campus directement
      type: DataTypes.UUID,
      allowNull: false,
    },
    academicYear: {
      // CORRIGÉ : SMALLINT 2023 au lieu de STRING "2023-2024"
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    semester: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: { min: 1, max: 2 },
    },
    amount: {
      // CORRIGÉ CRITIQUE : DECIMAL(10,2) au lieu de float64
      // Évite les erreurs d'arrondi sur les montants financiers
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 },
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    invoiceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    paidAt: {
      // null tant que la facture n'est pas réglée
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    paymentMethod: {
      type: DataTypes.ENUM('transfer', 'card', 'check', 'cash', 'other'),
      allowNull: true,
      defaultValue: null,
    },
    reference: {
      // Référence bancaire ou numéro de chèque
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'invoices',
    timestamps: true,
    indexes: [
      { fields: ['studentId'] },
      { fields: ['campusId'] },
      { fields: ['status'] },
      { fields: ['academicYear', 'semester'] },
      { fields: ['dueDate'] },
      // Index composite pour les relances automatiques
      { fields: ['status', 'dueDate'] },
    ],
  }
);

export default Invoice;
