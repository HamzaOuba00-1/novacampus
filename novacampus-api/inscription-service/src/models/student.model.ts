/**
 * models/student.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `students`.
 *
 * Ce profil étend le compte User de l'auth-service (relation 1:1
 * via userId). Il centralise toutes les données personnelles et
 * académiques de l'étudiant : coordonnées, programme, statut,
 * contact d'urgence.
 *
 * Corrections appliquées par rapport au fichier Excel :
 *   – Phone / Emergency_Phone : int64 → VARCHAR (format E.164)
 *   – Postal_Code             : int64 → CHAR(5)
 *   – Payment_Status          : synchronisé depuis le payment-service
 *     (stocké ici pour affichage rapide, sans appel cross-service)
 * ---------------------------------------------------------------
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { StudentStatus, PaymentStatus } from '../types';

interface StudentAttributes {
  id: string;
  userId: string;
  programId: string;
  campusId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  birthDate: Date | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  enrollmentYear: number;
  status: StudentStatus;
  paymentStatus: PaymentStatus;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StudentCreationAttributes
  extends Optional<
    StudentAttributes,
    | 'id'
    | 'birthDate'
    | 'phone'
    | 'address'
    | 'city'
    | 'postalCode'
    | 'status'
    | 'paymentStatus'
    | 'emergencyContactName'
    | 'emergencyContactPhone'
    | 'notes'
  > {}

class Student
  extends Model<StudentAttributes, StudentCreationAttributes>
  implements StudentAttributes
{
  public id!: string;
  public userId!: string;
  public programId!: string;
  public campusId!: string;
  public studentNumber!: string;
  public firstName!: string;
  public lastName!: string;
  public birthDate!: Date | null;
  public phone!: string | null;
  public address!: string | null;
  public city!: string | null;
  public postalCode!: string | null;
  public enrollmentYear!: number;
  public status!: StudentStatus;
  public paymentStatus!: PaymentStatus;
  public emergencyContactName!: string | null;
  public emergencyContactPhone!: string | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Student.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    userId: {
      // Référence vers le compte User de l'auth-service (1:1)
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    programId: {
      // Référence vers le programme de l'academic-service
      type: DataTypes.UUID,
      allowNull: false,
    },
    campusId: {
      // UUID du campus issu de l'auth-service
      type: DataTypes.UUID,
      allowNull: false,
    },
    studentNumber: {
      // Numéro étudiant unique : STU2023001…
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    firstName: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    },
    phone: {
      // Corrigé : int64 → VARCHAR format E.164 (+33 6 12 34 56 78)
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    city: {
      type: DataTypes.STRING(80),
      allowNull: true,
      defaultValue: null,
    },
    postalCode: {
      // Corrigé : int64 → CHAR(5) pour conserver le zéro initial
      type: DataTypes.CHAR(5),
      allowNull: true,
      defaultValue: null,
    },
    enrollmentYear: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'graduated', 'withdrawn'),
      allowNull: false,
      defaultValue: 'active',
    },
    paymentStatus: {
      // Snapshot synchronisé depuis le payment-service
      type: DataTypes.ENUM('up_to_date', 'pending', 'overdue'),
      allowNull: false,
      defaultValue: 'pending',
    },
    emergencyContactName: {
      type: DataTypes.STRING(120),
      allowNull: true,
      defaultValue: null,
    },
    emergencyContactPhone: {
      // Corrigé : int64 → VARCHAR format E.164
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: null,
    },
    notes: {
      // Notes internes réservées à l'administration
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'students',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId'] },
      { unique: true, fields: ['studentNumber'] },
      { fields: ['campusId'] },
      { fields: ['programId'] },
      { fields: ['status'] },
      { fields: ['paymentStatus'] },
    ],
  }
);

export default Student;
