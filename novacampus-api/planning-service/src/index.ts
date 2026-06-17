/**
 * index.ts
 * ---------------------------------------------------------------
 * Point d'entrée du service de planification Novacampus.
 * Port 3003 – distinct de auth (3001) et academic (3002).
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import sequelize from './config/database.config';
import planningRoutes from './routes/planning.route';

const app = express();
const PORT = parseInt(process.env.API_PORT ?? '3003', 10);

// ---------------------------------------------------------------
// Middlewares globaux
// ---------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------
// Routes API
// ---------------------------------------------------------------

/** Route de santé – utilisée par Docker healthcheck et la gateway */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'planning-service',
    timestamp: new Date().toISOString(),
  });
});

// Toutes les routes de planification sous /api
app.use('/api', planningRoutes);

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
    console.log('[Planning Service] Connexion PostgreSQL établie.');

    await sequelize.sync({ alter: true });
    console.log('[Planning Service] Modèles synchronisés.');

    app.listen(PORT, () => {
      console.log(`[Planning Service] Serveur démarré sur http://localhost:${PORT}`);
      console.log(`[Planning Service] Environnement : ${process.env.NODE_ENV ?? 'dev'}`);
    });
  } catch (err) {
    console.error('[Planning Service] Erreur au démarrage :', err);
    process.exit(1);
  }
}

startServer();
