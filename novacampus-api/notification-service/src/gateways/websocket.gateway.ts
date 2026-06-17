/**
 * gateways/websocket.gateway.ts
 * ---------------------------------------------------------------
 * Serveur WebSocket pour la livraison de notifications en temps réel.
 *
 * Architecture :
 *   – Un serveur WebSocket (ws) partagé avec le serveur HTTP Express
 *   – Chaque client s'authentifie via un token JWT en query param
 *   – Les connexions actives sont indexées par userId dans une Map
 *   – Un ping/pong périodique détecte et nettoie les connexions mortes
 *
 * Flux de connexion :
 *   Client → ws://host:3006/api/ws?token=<JWT>
 *   Serveur vérifie le token → stocke la connexion → envoie les
 *   notifications en attente → stream en temps réel ensuite
 *
 * Intégration avec le NotificationService :
 *   Le service appelle wsGateway.sendToUser(userId, message) après
 *   chaque création de notification pour diffuser immédiatement.
 * ---------------------------------------------------------------
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyAccessToken } from '../utils/jwt.util';
import { AuthenticatedWebSocket, WsMessage } from '../types';

// ---------------------------------------------------------------
// État global des connexions actives
// Map<userId, Set<AuthenticatedWebSocket>> pour supporter
// plusieurs sessions simultanées (mobile + web + tablette)
// ---------------------------------------------------------------
const connections = new Map<string, Set<AuthenticatedWebSocket>>();

const PING_INTERVAL_MS = parseInt(
  process.env.WS_PING_INTERVAL_MS ?? '30000',
  10
);

/**
 * Initialise le serveur WebSocket et attache les handlers.
 *
 * @param wss - Instance WebSocketServer créée dans index.ts
 */
export function initWebSocketGateway(wss: WebSocketServer): void {
  // Ping périodique pour détecter les connexions zombies
  const interval = setInterval(() => {
    wss.clients.forEach((rawClient) => {
      const client = rawClient as AuthenticatedWebSocket;
      if (client.isAlive === false) {
        console.log(`[WS] Connexion morte détectée pour userId=${client.userId} — terminaison.`);
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, PING_INTERVAL_MS);

  wss.on('close', () => clearInterval(interval));

  wss.on('connection', (rawWs: WebSocket, req: IncomingMessage) => {
    const ws = rawWs as AuthenticatedWebSocket;

    // ── Authentification via query param token ──────────────
    const url = new URL(req.url ?? '', `http://localhost`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.send(JSON.stringify({ type: 'error', payload: { message: 'Token manquant.' } }));
      ws.close(1008, 'Token manquant');
      return;
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      ws.send(JSON.stringify({ type: 'error', payload: { message: 'Token invalide ou expiré.' } }));
      ws.close(1008, 'Token invalide');
      return;
    }

    // ── Enregistrement de la connexion ─────────────────────
    ws.userId = decoded.id;
    ws.role = decoded.role;
    ws.isAlive = true;

    if (!connections.has(decoded.id)) {
      connections.set(decoded.id, new Set());
    }
    connections.get(decoded.id)!.add(ws);

    console.log(`[WS] Connexion établie : userId=${decoded.id} role=${decoded.role} (${connections.get(decoded.id)!.size} session(s))`);

    // Confirmation de connexion au client
    const welcomeMsg: WsMessage = {
      type: 'notification',
      payload: {
        id: 'system-connect',
        notificationType: 'system',
        title: 'Connecté',
        body: 'Vous êtes connecté au flux de notifications en temps réel.',
        createdAt: new Date().toISOString(),
      },
    };
    ws.send(JSON.stringify(welcomeMsg));

    // ── Gestion des messages entrants ──────────────────────
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        // Réponse aux pings client pour maintenir la connexion
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // Messages malformés ignorés silencieusement
      }
    });

    // ── Réponse aux pings serveur (keepalive) ──────────────
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // ── Nettoyage à la déconnexion ─────────────────────────
    ws.on('close', () => {
      const userSessions = connections.get(ws.userId!);
      if (userSessions) {
        userSessions.delete(ws);
        if (userSessions.size === 0) {
          connections.delete(ws.userId!);
        }
      }
      console.log(`[WS] Connexion fermée : userId=${ws.userId}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Erreur client userId=${ws.userId}:`, err.message);
    });
  });

  console.log('[WS] Serveur WebSocket initialisé.');
}

// ---------------------------------------------------------------
// API publique du gateway – utilisée par NotificationService
// ---------------------------------------------------------------

/**
 * Envoie un message WebSocket à toutes les sessions actives d'un utilisateur.
 * Sans erreur si l'utilisateur est hors ligne (la notif est persistée en DB).
 *
 * @param userId  - UUID de l'utilisateur destinataire
 * @param message - Message JSON normalisé à envoyer
 * @returns Nombre de sessions ayant reçu le message
 */
export function sendToUser(userId: string, message: WsMessage): number {
  const sessions = connections.get(userId);
  if (!sessions || sessions.size === 0) return 0;

  const payload = JSON.stringify(message);
  let sent = 0;

  sessions.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      sent++;
    }
  });

  return sent;
}

/**
 * Envoie un message à plusieurs utilisateurs en une passe.
 * Utilisé pour les notifications groupées (ex: tous les étudiants d'un cours).
 *
 * @param userIds - Liste des UUID destinataires
 * @param message - Message à diffuser
 * @returns Nombre total de livraisons WebSocket réussies
 */
export function broadcastToUsers(userIds: string[], message: WsMessage): number {
  let totalSent = 0;
  for (const userId of userIds) {
    totalSent += sendToUser(userId, message);
  }
  return totalSent;
}

/**
 * Retourne les statistiques des connexions actives.
 * Utilisé par la route de santé du service.
 */
export function getConnectionStats(): { users: number; sessions: number } {
  let sessions = 0;
  connections.forEach((set) => { sessions += set.size; });
  return { users: connections.size, sessions };
}
