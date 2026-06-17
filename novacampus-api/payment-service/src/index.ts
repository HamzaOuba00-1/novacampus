/**
 * index.ts
 * ---------------------------------------------------------------
 * Point d'entrée du service paiements Novacampus.
 * Port 3005 – distinct des autres services.
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import express from 'express';
import sequelize from './config/database.config';
import paymentRoutes from './routes/payment.route';

const app = express();
const PORT = parseInt(process.env.API_PORT ?? '3005', 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/** Route de santé */
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'payment-service',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', paymentRoutes);

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
    console.log('[Payment Service] Connexion PostgreSQL établie.');

    await sequelize.sync({ alter: true });
    console.log('[Payment Service] Modèles synchronisés.');

    app.listen(PORT, () => {
      console.log(`[Payment Service] Serveur démarré sur http://localhost:${PORT}`);
      console.log(`[Payment Service] Environnement : ${process.env.NODE_ENV ?? 'dev'}`);
    });
  } catch (err) {
    console.error('[Payment Service] Erreur au démarrage :', err);
    process.exit(1);
  }
}

startServer();
