/**
 * config/database.config.ts
 * ---------------------------------------------------------------
 * Connexion Sequelize vers la base PostgreSQL dédiée au service
 * de planification (novacampus_planning).
 *
 * Isolation des bases par microservice : chaque service possède
 * sa propre base pour garantir l'indépendance au déploiement.
 * ---------------------------------------------------------------
 */
import path from 'path';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

// Lecture des variables d'environnement avec valeurs par défaut sécurisées
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const {
  DB_NAME = 'novacampus_planning',
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres',
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  NODE_ENV = 'dev',
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  dialect: 'postgres',
  logging: NODE_ENV === 'dev' ? console.log : false,
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

export default sequelize;
