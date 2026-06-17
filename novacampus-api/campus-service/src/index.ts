/**
 * index.ts
 * ---------------------------------------------------------------
 * Point d'entrée du service campus / admin Novacampus.
 * Port 3007 – dernier microservice métier de l'ERP.
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import sequelize from './config/database.config';
import campusRoutes from './routes/campus.route';

const app = express();
const PORT = parseInt(process.env.API_PORT ?? '3007', 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/** Route de santé */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'campus-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', campusRoutes);

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
    console.log('[Campus Service] Connexion PostgreSQL établie.');

    await sequelize.sync({ alter: true });
    console.log('[Campus Service] Modèles synchronisés.');

    app.listen(PORT, () => {
      console.log(`[Campus Service] Serveur démarré sur http://localhost:${PORT}`);
      console.log(`[Campus Service] Environnement : ${process.env.NODE_ENV ?? 'dev'}`);
    });
  } catch (err) {
    console.error('[Campus Service] Erreur au démarrage :', err);
    process.exit(1);
  }
}

startServer();
