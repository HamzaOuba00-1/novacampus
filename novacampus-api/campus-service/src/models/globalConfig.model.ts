/**
 * models/globalConfig.model.ts
 * ---------------------------------------------------------------
 * Table de configuration clé-valeur du système ERP.
 *
 * Stocke les paramètres globaux ou par campus modifiables
 * sans redéploiement : seuils d'assiduité, délais de relance,
 * paramètres IA, messages système…
 *
 * Chaque modification est tracée dans l'audit log (config.update).
 *
 * La clé primaire est un UUID auto-généré.
 * L'unicité est garantie par un index composite (key + campusId)
 * pour permettre les valeurs null sur campusId (configs globales).
 *
 * Exemples de clés :
 *   – "attendance.min_rate"          : 0.75 (seuil assiduité 75%)
 *   – "payment.reminder.level1_days" : 7
 *   – "ai.dropout_risk_threshold"    : 0.65
 *   – "academic.passing_grade"       : 10.0
 * ---------------------------------------------------------------
 */
import { DataTypes, Model } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.config';

// ---------------------------------------------------------------
// Interface décrivant tous les attributs de l'entité GlobalConfig
// ---------------------------------------------------------------
interface GlobalConfigAttributes {
  id: string;
  key: string;
  value: string;
  description: string | null;
  campusId: string | null;   // null = configuration globale (tous campus)
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// ---------------------------------------------------------------
// Attributs optionnels lors de la création
// Optional<> supprimé car non exporté par Sequelize v6+
// ---------------------------------------------------------------
type GlobalConfigCreationAttributes = Omit<
  GlobalConfigAttributes,
  'id' | 'description' | 'campusId' | 'updatedBy'
> & {
  id?: string;
  description?: string | null;
  campusId?: string | null;
  updatedBy?: string | null;
};

// ---------------------------------------------------------------
// Classe du modèle avec typage fort via les génériques Sequelize
// ---------------------------------------------------------------
class GlobalConfig
  extends Model<GlobalConfigAttributes, GlobalConfigCreationAttributes>
  implements GlobalConfigAttributes
{
  public id!: string;
  public key!: string;
  public value!: string;
  public description!: string | null;
  public campusId!: string | null;
  public updatedBy!: string | null;

  // Timestamps gérés automatiquement par Sequelize
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GlobalConfig.init(
  {
    id: {
      // Clé primaire UUID auto-générée
      // Nécessaire car campusId peut être null (configs globales),
      // ce qui empêche son utilisation comme clé primaire composite
      type: DataTypes.UUID,
      defaultValue: () => uuidv4(),
      primaryKey: true,
    },
    key: {
      // Clé de configuration au format "domaine.parametre"
      // Ex : "attendance.min_rate", "payment.reminder.level1_days"
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    value: {
      // Valeur stockée en string – à parser selon le type attendu
      // Ex : "0.75" pour un float, "7" pour un entier
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      // Explication lisible de la configuration pour l'interface admin
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    campusId: {
      // null = valeur par défaut globale (s'applique à tous les campus)
      // UUID = surcharge pour un campus spécifique
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
    updatedBy: {
      // UUID de l'admin ayant modifié la configuration (auth-service)
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    sequelize,
    tableName: 'global_config',
    timestamps: true,
    indexes: [
      // Index unique composite : une seule valeur par clé par campus
      // Permet null sur campusId grâce à l'UUID comme vrai PK
      { unique: true, fields: ['key', 'campusId'] },
      // Index simple pour filtrer les configs d'un campus
      { fields: ['campusId'] },
    ],
  }
);

export default GlobalConfig;