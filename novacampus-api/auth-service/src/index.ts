/**
 * index.ts
 * ---------------------------------------------------------------
 * Point d'entrée du service d'authentification Novacampus.
 *
 * Séquence de démarrage :
 *   1. Chargement des variables d'environnement
 *   2. Vérification de la connexion à la base de données
 *   3. Synchronisation des modèles Sequelize avec PostgreSQL
 *   4. Montage des middlewares globaux (parsing JSON, sécurité)
 *   5. Montage des routes API
 *   6. Démarrage du serveur Express sur le port configuré
 *
 * Si la connexion à la base échoue au démarrage, le processus
 * se termine avec un code d'erreur pour permettre à Docker/K8s
 * de redémarrer le conteneur automatiquement.
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import sequelize from './config/database.config';
import authRoutes from './routes/auth.route';
import userRoutes from './routes/user.route';

const app = express();
const PORT = parseInt(process.env.API_PORT ?? '3001', 10);

// ---------------------------------------------------------------
// Middlewares globaux
// ---------------------------------------------------------------

// Parsing automatique du corps des requêtes au format JSON
app.use(express.json());

// Parsing des corps encodés en URL (formulaires HTML)
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------
// Routes API
// ---------------------------------------------------------------

/**
 * Route de santé – vérification de disponibilité du service.
 * Utilisée par Docker healthcheck, NGINX et les systèmes de monitoring.
 * Retourne explicitement 200 pour confirmer que le service répond.
 */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Module d'authentification (login, register, refresh, logout, validate)
app.use('/api/auth', authRoutes);

// Module de gestion des utilisateurs (CRUD admin)
app.use('/api/users', userRoutes);

// Gestionnaire de routes inconnues (404)
app.use((_req, res) => {
  res.status(404).json({
    status: 'failure',
    code: 'ERR_NOT_FOUND',
    message: 'La route demandée n\'existe pas.',
  });
});

// ---------------------------------------------------------------
// Démarrage du serveur avec vérification de la base de données
// ---------------------------------------------------------------

async function startServer(): Promise<void> {
  try {
    // Test de la connexion à PostgreSQL
    await sequelize.authenticate();
    console.log('[Auth Service] Connexion PostgreSQL établie.');

    // Synchronisation des modèles
    // alter:true met à jour les colonnes sans détruire les données
    // En production, utiliser des migrations Sequelize à la place
    await sequelize.sync({ alter: true });
    console.log('[Auth Service] Modèles synchronisés.');

    // Démarrage du serveur HTTP
    app.listen(PORT, () => {
      console.log(`[Auth Service] Serveur démarré sur http://localhost:${PORT}`);
      console.log(`[Auth Service] Environnement : ${process.env.NODE_ENV ?? 'dev'}`);
    });
  } catch (err) {
    console.error('[Auth Service] Erreur au démarrage :', err);
    // Arrêt avec code d'erreur pour déclencher le redémarrage par l'orchestrateur
    process.exit(1);
  }
}

startServer();
