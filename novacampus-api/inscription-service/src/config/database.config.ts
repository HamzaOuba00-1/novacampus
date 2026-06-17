/**
 * config/database.config.ts
 * ---------------------------------------------------------------
 * Connexion Sequelize vers la base PostgreSQL dédiée au service
 * d'inscriptions (novacampus_inscription).
 *
 * Les paramètres sont lus depuis les variables d'environnement
 * afin de ne jamais exposer d'identifiants dans le code source.
 * ---------------------------------------------------------------
 */
import path from 'path';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Chargement des variables d'environnement AVANT tout accès à process.env
// Chemin explicite pour garantir la lecture du .env peu importe le répertoire
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Lecture des variables d'environnement avec valeurs par défaut sécurisées
const {
  DB_NAME = 'novacampus_inscription',
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

  // Désactiver les logs SQL en production pour éviter les fuites de données
  logging: NODE_ENV === 'dev' ? console.log : false,

  pool: {
    // Nombre maximum de connexions simultanées dans le pool
    max: 10,
    // Nombre minimum de connexions maintenues actives
    min: 0,
    // Délai d'attente avant d'abandonner une demande de connexion (ms)
    acquire: 30000,
    // Durée d'inactivité avant fermeture d'une connexion (ms)
    idle: 10000,
  },
});

export default sequelize;