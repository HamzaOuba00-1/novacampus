/**
 * index.ts
 * ---------------------------------------------------------------
 * Point d'entrée du service Reporting / IA Novacampus.
 * Port 3008 – dernier service, agrégateur de toute l'architecture.
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import sequelize from './config/database.config';
import reportingRoutes from './routes/reporting.route';

const app = express();
const PORT = parseInt(process.env.API_PORT ?? '3008', 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/** Route de santé */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'reporting-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', reportingRoutes);

app.use((_req, res) => {
  res.status(404).json({
    status: 'failure',
    code: 'ERR_NOT_FOUND',
    message: 'La route demandée n\'existe pas.',
  });
});

async function startServer(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Reporting Service] Connexion PostgreSQL établie.');

    await sequelize.sync({ alter: true });
    console.log('[Reporting Service] Modèles synchronisés.');

    app.listen(PORT, () => {
      console.log(`[Reporting Service] Serveur démarré sur http://localhost:${PORT}`);
      console.log(`[Reporting Service] Environnement : ${process.env.NODE_ENV ?? 'dev'}`);
    });
  } catch (err) {
    console.error('[Reporting Service] Erreur au démarrage :', err);
    process.exit(1);
  }
}

startServer();
