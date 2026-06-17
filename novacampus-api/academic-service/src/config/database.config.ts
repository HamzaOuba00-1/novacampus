/**
 * config/database.config.ts
 * ---------------------------------------------------------------
 * Connexion Sequelize vers la base PostgreSQL dédiée au service
 * académique (novacampus_academic).
 *
 * Chaque microservice possède sa propre base de données pour
 * garantir l'isolation et la scalabilité indépendante.
 * ---------------------------------------------------------------
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

// Lecture des variables d'environnement avec valeurs par défaut sécurisées
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const {
  DB_NAME = 'novacampus_academic',
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
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default sequelize;
