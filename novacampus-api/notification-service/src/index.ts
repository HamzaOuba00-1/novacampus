/**
 * index.ts
 * ---------------------------------------------------------------
 * Point d'entrée du service de notifications Novacampus.
 * Port 3006.
 *
 * Particularité : ce service expose DEUX protocoles sur le même port :
 *   – HTTP  (Express) : routes REST /api/notifications/*
 *   – WS    (ws)      : endpoint WebSocket /api/ws?token=<JWT>
 *
 * Le serveur HTTP Node.js est partagé entre Express et le serveur
 * WebSocket via le mécanisme d'upgrade de protocole HTTP → WS.
 *
 * Flux de connexion WS :
 *   Client connecte ws://host:3006/api/ws?token=<accessToken>
 *   → Handshake HTTP upgrade
 *   → auth JWT vérifié dans websocket.gateway.ts
 *   → connexion ajoutée à la Map des connexions actives
 *   → notifications livrées en temps réel
 * ---------------------------------------------------------------
 */

import 'dotenv/config';
import http from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import sequelize from './config/database.config';
import notificationRoutes from './routes/notification.route';
import { initWebSocketGateway, getConnectionStats } from './gateways/websocket.gateway';

const app = express();
const PORT = parseInt(process.env.API_PORT ?? '3006', 10);

// ---------------------------------------------------------------
// Middlewares globaux Express
// ---------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------
// Routes HTTP
// ---------------------------------------------------------------

/** Route de santé – inclut les stats WebSocket */
app.get('/api/health', (_req, res) => {
  const wsStats = getConnectionStats();
  res.status(200).json({
    status: 'UP',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    websocket: wsStats,
  });
});

app.use('/api', notificationRoutes);

app.use((_req, res) => {
  res.status(404).json({
    status: 'failure',
    code: 'ERR_NOT_FOUND',
    message: 'La route demandée n\'existe pas.',
  });
});

// ---------------------------------------------------------------
// Création du serveur HTTP partagé (Express + WebSocket)
// ---------------------------------------------------------------
const server = http.createServer(app);

// ---------------------------------------------------------------
// Serveur WebSocket – upgrade sur /api/ws uniquement
// ---------------------------------------------------------------
const wss = new WebSocketServer({ noServer: true });

// Intercepter les requêtes d'upgrade HTTP→WS
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '', `http://localhost`);

  // Seul le path /api/ws est accepté pour les connexions WebSocket
  if (url.pathname === '/api/ws') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// Initialisation du gateway WebSocket avec les handlers
initWebSocketGateway(wss);

// ---------------------------------------------------------------
// Démarrage du serveur
// ---------------------------------------------------------------
async function startServer(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('[Notification Service] Connexion PostgreSQL établie.');

    await sequelize.sync({ alter: true });
    console.log('[Notification Service] Modèles synchronisés.');

    server.listen(PORT, () => {
      console.log(`[Notification Service] HTTP  : http://localhost:${PORT}`);
      console.log(`[Notification Service] WS    : ws://localhost:${PORT}/api/ws?token=<JWT>`);
      console.log(`[Notification Service] Env   : ${process.env.NODE_ENV ?? 'dev'}`);
    });
  } catch (err) {
    console.error('[Notification Service] Erreur au démarrage :', err);
    process.exit(1);
  }
}

startServer();
