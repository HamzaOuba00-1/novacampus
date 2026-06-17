/**
 * models/scheduleException.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `schedule_exceptions`.
 *
 * Une exception est une modification ponctuelle d'un créneau
 * récurrent pour une date spécifique :
 *   – Changement de salle
 *   – Changement d'horaire
 *   – Annulation d'une séance
 *
 * Lors de la construction de l'emploi du temps d'une semaine,
 * les exceptions de la période remplacent les données du Schedule.
 *
 * Déclencheur immédiat : création d'une exception → notification
 * push à tous les étudiants inscrits au cours concerné.
 *
 * Note : les clés étrangères (scheduleId, newRoomId) sont gérées
 * via les associations Sequelize et non via `references` inline
 * pour éviter les erreurs de syntaxe SQL lors du sync({ alter: true }).
 * ---------------------------------------------------------------
 */

import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';
import { ExceptionType } from '../types';

// ---------------------------------------------------------------
// Interface décrivant tous les attributs de l'entité
// ---------------------------------------------------------------
interface ScheduleExceptionAttributes {
  id: string;
  scheduleId: string;
  exceptionDate: string;
  type: ExceptionType;
  newRoomId: string | null;
  newStartTime: string | null;
  newEndTime: string | null;
  reason: string | null;
  createdBy: string;
  createdAt?: Date;
}

// ---------------------------------------------------------------
// Attributs optionnels lors de la création
// Optional<> supprimé car non exporté par Sequelize v6+
// ---------------------------------------------------------------
type ScheduleExceptionCreationAttributes = Omit<
  ScheduleExceptionAttributes,
  'id' | 'newRoomId' | 'newStartTime' | 'newEndTime' | 'reason'
> & {
  id?: string;
  newRoomId?: string | null;
  newStartTime?: string | null;
  newEndTime?: string | null;
  reason?: string | null;
};

// ---------------------------------------------------------------
// Classe du modèle avec typage fort via les génériques Sequelize
// ---------------------------------------------------------------
class ScheduleException
  extends Model<ScheduleExceptionAttributes, ScheduleExceptionCreationAttributes>
  implements ScheduleExceptionAttributes
{
  public id!: string;
  public scheduleId!: string;
  public exceptionDate!: string;
  public type!: ExceptionType;
  public newRoomId!: string | null;
  public newStartTime!: string | null;
  public newEndTime!: string | null;
  public reason!: string | null;
  public createdBy!: string;

  // Timestamp de création uniquement (pas d'updatedAt sur les exceptions)
  public readonly createdAt!: Date;
}

ScheduleException.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    scheduleId: {
      // FK vers schedules – gérée via association, pas via references inline
      type: DataTypes.UUID,
      allowNull: false,
    },
    exceptionDate: {
      // Date exacte de la séance modifiée : "YYYY-MM-DD"
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('room_change', 'time_change', 'cancelled'),
      allowNull: false,
    },
    newRoomId: {
      // Nouvelle salle pour ce jour précis (null si inchangée ou annulée)
      // FK vers rooms – gérée via association, pas via references inline
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    newStartTime: {
      // Nouvel horaire de début "HH:MM" – null si inchangé
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: null,
    },
    newEndTime: {
      // Nouvel horaire de fin "HH:MM" – null si inchangé
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: null,
    },
    reason: {
      // Motif affiché aux étudiants dans la notification
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    createdBy: {
      // UUID de l'administrateur ayant créé l'exception
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'schedule_exceptions',
    timestamps: true,
    // Pas de updatedAt : une exception ne doit pas être modifiée,
    // elle doit être supprimée et recréée
    updatedAt: false,
    indexes: [
      { fields: ['scheduleId'] },
      // Index sur la date pour les requêtes "emploi du temps de la semaine"
      { fields: ['exceptionDate'] },
    ],
  }
);

export default ScheduleException;