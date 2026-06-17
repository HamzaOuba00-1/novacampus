/**
 * config/database.config.ts
 * ---------------------------------------------------------------
 * Configuration et initialisation de la connexion Sequelize
 * vers la base de données PostgreSQL.
 *
 * L'instance Sequelize est exportée en singleton pour être
 * partagée dans tout le service (modèles, seed, index).
 *
 * Les paramètres sont lus depuis les variables d'environnement
 * afin de ne jamais exposer d'identifiants dans le code source.
 * ---------------------------------------------------------------
 */
import path from 'path';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Chargement des variables d'environnement AVANT tout accès à process.env
// Chemin explicite pour garantir la lecture du .env peu importe le répertoire d'exécution
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Debug temporaire – à supprimer une fois la connexion validée
console.log('DB_HOST:', JSON.stringify(process.env.DB_HOST));
console.log('DB_USER:', JSON.stringify(process.env.DB_USER));
console.log('DB_PASSWORD:', JSON.stringify(process.env.DB_PASSWORD));
console.log('DB_NAME:', JSON.stringify(process.env.DB_NAME));

// Lecture des variables d'environnement avec valeurs par défaut sécurisées
const {
  DB_NAME = 'novacampus_auth',
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

  // Désactiver les logs SQL en production pour éviter les fuites de données sensibles
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