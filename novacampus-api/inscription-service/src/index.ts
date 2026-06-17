/**
 * index.ts
 * ---------------------------------------------------------------
 * Point d'entrée du service d'inscriptions Novacampus.
 * Port 3004 – distinct des autres services.
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import sequelize from './config/database.config';
import inscriptionRoutes from './routes/inscription.route';

const app = express();
const PORT = parseInt(process.env.API_PORT ?? '3004', 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Exposition des documents uploadés en développement
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

/** Route de santé */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'inscription-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', inscriptionRoutes);

app.use((_req, res) => {
  res.status(404).json({ status: 'failure', code: 'ERR_NOT_FOUND', message: 'La route demandée n\'existe pas.' });
});

async function startServer(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Inscription Service] Connexion PostgreSQL établie.');

    await sequelize.sync({ alter: true });
    console.log('[Inscription Service] Modèles synchronisés.');

    app.listen(PORT, () => {
      console.log(`[Inscription Service] Serveur démarré sur http://localhost:${PORT}`);
      console.log(`[Inscription Service] Environnement : ${process.env.NODE_ENV ?? 'dev'}`);
    });
  } catch (err) {
    console.error('[Inscription Service] Erreur au démarrage :', err);
    process.exit(1);
  }
}

startServer();
