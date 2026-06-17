/**
 * index.ts
 * ---------------------------------------------------------------
 * Point d'entrée du service académique Novacampus.
 *
 * Séquence de démarrage :
 *   1. Chargement des variables d'environnement
 *   2. Connexion et synchronisation de la base de données
 *   3. Montage des middlewares globaux
 *   4. Montage des routes sous le préfixe /api
 *   5. Démarrage du serveur sur le port 3002
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import sequelize from './config/database.config';
import academicRoutes from './routes/academic.route';

const app = express();
const PORT = parseInt(process.env.API_PORT ?? '3002', 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

// ---------------------------------------------------------------
// Middlewares globaux
// ---------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Exposition des fichiers uploadés en développement
// En production, ces fichiers sont servis par un CDN ou NGINX
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// ---------------------------------------------------------------
// Routes API
// ---------------------------------------------------------------

/**
 * Route de santé – utilisée par Docker healthcheck et la gateway.
 */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'academic-service',
    timestamp: new Date().toISOString(),
  });
});

// Montage de toutes les routes académiques sous /api
app.use('/api', academicRoutes);

// Gestionnaire de routes inconnues
app.use((_req, res) => {
  res.status(404).json({
    status: 'failure',
    code: 'ERR_NOT_FOUND',
    message: 'La route demandée n\'existe pas.',
  });
});

// ---------------------------------------------------------------
// Démarrage du serveur
// ---------------------------------------------------------------

async function startServer(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Academic Service] Connexion PostgreSQL établie.');

    await sequelize.sync({ alter: true });
    console.log('[Academic Service] Modèles synchronisés.');

    app.listen(PORT, () => {
      console.log(`[Academic Service] Serveur démarré sur http://localhost:${PORT}`);
      console.log(`[Academic Service] Environnement : ${process.env.NODE_ENV ?? 'dev'}`);
    });
  } catch (err) {
    console.error('[Academic Service] Erreur au démarrage :', err);
    process.exit(1);
  }
}

startServer();
