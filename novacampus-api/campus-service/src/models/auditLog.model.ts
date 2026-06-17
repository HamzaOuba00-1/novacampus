/**
 * models/auditLog.model.ts
 * ---------------------------------------------------------------
 * Modèle Sequelize représentant la table `audit_logs`.
 *
 * Journal append-only de toutes les actions critiques du système.
 *
 * Propriétés importantes :
 *   – Jamais de UPDATE ou DELETE sur cette table (immuable)
 *   – Stocke le before/after en JSONB pour la comparaison
 *   – Reçoit les entrées de TOUS les microservices via l'API
 *     POST /api/audit/log (route interne inter-services)
 *   – Utilisé pour la conformité RGPD et les audits qualité
 *
 * Note : entityId est STRING(100) et non UUID pour supporter
 * tous les types d'identifiants : UUID (Campus, User…),
 * entier converti en string (AcademicYear : "2024"),
 * ou clé texte (GlobalConfig : "attendance.min_rate").
 *
 * La table est partitionnée par mois en production pour gérer
 * le volume (commentaire de configuration fourni dans la seed).
 * ---------------------------------------------------------------
 */
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';

// ---------------------------------------------------------------
// Interface décrivant tous les attributs de l'entité AuditLog
// ---------------------------------------------------------------
interface AuditLogAttributes {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeState: object | null;
  afterState: object | null;
  ipAddress: string | null;
  campusId: string | null;
  createdAt?: Date;
}

// ---------------------------------------------------------------
// Attributs optionnels lors de la création
// Optional<> supprimé car non exporté par Sequelize v6+
// ---------------------------------------------------------------
type AuditLogCreationAttributes = Omit<
  AuditLogAttributes,
  'id' | 'entityId' | 'beforeState' | 'afterState' | 'ipAddress' | 'campusId'
> & {
  id?: string;
  entityId?: string | null;
  beforeState?: object | null;
  afterState?: object | null;
  ipAddress?: string | null;
  campusId?: string | null;
};

// ---------------------------------------------------------------
// Classe du modèle avec typage fort via les génériques Sequelize
// ---------------------------------------------------------------
class AuditLog
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  public id!: string;
  public actorId!: string;
  public action!: string;
  public entityType!: string;
  public entityId!: string | null;
  public beforeState!: object | null;
  public afterState!: object | null;
  public ipAddress!: string | null;
  public campusId!: string | null;

  // Pas d'updatedAt – table immuable (append-only)
  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    actorId: {
      // UUID de l'utilisateur ayant réalisé l'action (auth-service)
      type: DataTypes.UUID,
      allowNull: false,
    },
    action: {
      // Format "<entité>.<action>" : "grade.create", "invoice.pay"…
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    entityType: {
      // Nom du modèle concerné : "Grade", "Invoice", "Schedule"…
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    entityId: {
      // STRING au lieu de UUID pour supporter tous les types d'identifiants :
      //   – UUID valide     : entités Campus, User, Invoice…
      //   – Entier en string : AcademicYear ("2024")
      //   – Clé texte       : GlobalConfig ("attendance.min_rate")
      // null si l'action est globale et ne concerne pas une entité précise
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
    },
    beforeState: {
      // Snapshot JSON de l'état avant modification
      // null pour les créations (pas d'état précédent)
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    afterState: {
      // Snapshot JSON de l'état après modification
      // null pour les suppressions (entité supprimée)
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    ipAddress: {
      // Adresse IP du client pour les audits de sécurité
      type: DataTypes.INET,
      allowNull: true,
      defaultValue: null,
    },
    campusId: {
      // Campus concerné pour filtrer les logs par campus
      // null pour les actions globales (direction, config système…)
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    // Pas d'updatedAt – table immuable (append-only)
    // Une entrée d'audit ne doit jamais être modifiée
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['actorId'] },
      { fields: ['entityType', 'entityId'] },
      { fields: ['action'] },
      { fields: ['campusId'] },
      // Index sur createdAt pour les requêtes de plage de dates
      { fields: ['createdAt'] },
    ],
  }
);

export default AuditLog;