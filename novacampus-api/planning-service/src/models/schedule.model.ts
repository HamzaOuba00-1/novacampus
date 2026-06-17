/**
 * models/schedule.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `schedules`.
 *
 * Un créneau (Schedule) est une occurrence récurrente d'un cours
 * dans une salle, à un jour et une heure fixes sur un semestre.
 *
 * Corrections appliquées par rapport au fichier Excel d'origine :
 *   – Start_Time / End_Time : object → TIME (string HH:MM en PG)
 *   – Academic_Year : string "2023-2024" → SMALLINT 2023
 *   – Room_ID supprimé de la table Course (redondance corrigée)
 *
 * courseId et instructorId proviennent de l'academic-service.
 * roomId est une FK locale vers la table `rooms` de ce service.
 *
 * Note : references inline supprimées pour éviter les erreurs SQL
 * lors du sync({ alter: true }) — FK gérées via associations Sequelize.
 *
 * Déclencheurs :
 *   – Modification de updatedAt → notification push étudiants/enseignants
 * ---------------------------------------------------------------
 */
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { ScheduleStatus } from '../types';

// ---------------------------------------------------------------
// Interface décrivant tous les attributs de l'entité Schedule
// ---------------------------------------------------------------
interface ScheduleAttributes {
  id: string;
  courseId: string;
  instructorId: string;
  roomId: string;
  academicYear: number;
  semester: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: ScheduleStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

// ---------------------------------------------------------------
// Attributs optionnels lors de la création
// Optional<> supprimé car non exporté par Sequelize v6+
// ---------------------------------------------------------------
type ScheduleCreationAttributes = Omit<ScheduleAttributes, 'id' | 'status'> & {
  id?: string;
  status?: ScheduleStatus;
};

// ---------------------------------------------------------------
// Classe du modèle avec typage fort via les génériques Sequelize
// ---------------------------------------------------------------
class Schedule
  extends Model<ScheduleAttributes, ScheduleCreationAttributes>
  implements ScheduleAttributes
{
  public id!: string;
  public courseId!: string;
  public instructorId!: string;
  public roomId!: string;
  public academicYear!: number;
  public semester!: number;
  public dayOfWeek!: number;
  public startTime!: string;
  public endTime!: string;
  public status!: ScheduleStatus;

  // Timestamps gérés automatiquement par Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Schedule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    courseId: {
      // UUID du cours issu de l'academic-service
      // Pas de FK cross-service en DB : contrainte gérée applicativement
      type: DataTypes.UUID,
      allowNull: false,
    },
    instructorId: {
      // UUID de l'enseignant issu de l'auth-service
      // Pas de FK cross-service en DB : contrainte gérée applicativement
      type: DataTypes.UUID,
      allowNull: false,
    },
    roomId: {
      // FK vers rooms – gérée via association, pas via references inline
      // pour éviter les erreurs SQL lors du sync({ alter: true })
      type: DataTypes.UUID,
      allowNull: false,
    },
    academicYear: {
      // Corrigé : entier 2023 au lieu de la chaîne "2023-2024"
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    semester: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: { min: 1, max: 2 },
    },
    dayOfWeek: {
      // 0 = Lundi, 1 = Mardi … 4 = Vendredi
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: { min: 0, max: 6 },
    },
    startTime: {
      // Corrigé : type TIME stocké comme string "HH:MM" (ex : "08:30")
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: { is: /^\d{2}:\d{2}$/ },
    },
    endTime: {
      type: DataTypes.STRING(5),
      allowNull: false,
      validate: { is: /^\d{2}:\d{2}$/ },
    },
    status: {
      // active    : créneau en cours
      // cancelled : créneau annulé définitivement
      // modified  : créneau modifié ponctuellement via une exception
      type: DataTypes.ENUM('active', 'cancelled', 'modified'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    sequelize,
    tableName: 'schedules',
    timestamps: true,
    indexes: [
      { fields: ['courseId'] },
      { fields: ['instructorId'] },
      { fields: ['roomId'] },
      { fields: ['academicYear', 'semester'] },
      // Index composite pour la détection rapide de conflits de salle
      { fields: ['roomId', 'dayOfWeek', 'academicYear', 'semester'] },
    ],
  }
);

export default Schedule;