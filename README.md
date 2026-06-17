# Novacampus Alliance — ERP Académique

ERP multi-campus pour la gestion académique, administrative et financière d'un réseau d'écoles. Architecture microservices (8 services indépendants) avec gateway NGINX, agent IA de détection de risques, et frontend Next.js par rôle (étudiant, enseignant, admin, direction).

```
novacampus/
├── novacampus-api/          8 microservices + gateway NGINX + Docker Compose
└── novacampus-frontend/     Application Next.js (App Router)
```

## Sommaire

- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation rapide (Docker)](#installation-rapide-docker)
- [Peuplement des données (seed)](#peuplement-des-données-seed)
- [Lancer le frontend](#lancer-le-frontend)
- [Comptes de test](#comptes-de-test)
- [Installation sans Docker (dev local)](#installation-sans-docker-dev-local)
- [Vérifier que tout fonctionne](#vérifier-que-tout-fonctionne)
- [Arrêter / réinitialiser](#arrêter--réinitialiser)
- [Dépannage](#dépannage)

---

## Architecture

| Service | Port | Rôle |
|---|---|---|
| `auth-service` | 3001 | Authentification JWT, comptes utilisateurs, RBAC |
| `academic-service` | 3002 | Cours, notes, absences, deadlines, ressources pédagogiques |
| `planning-service` | 3003 | Salles, créneaux, conflits, exceptions d'emploi du temps |
| `inscription-service` | 3004 | Dossiers étudiants/enseignants, documents |
| `payment-service` | 3005 | Factures, relances automatiques, statistiques financières |
| `notification-service` | 3006 | Notifications push/email + WebSocket temps réel |
| `campus-service` | 3007 | Campus, années académiques, audit log, configuration globale |
| `reporting-service` | 3008 | KPIs, dashboards, agent IA de détection de risques, exports |
| `gateway` (NGINX) | 8080 | Point d'entrée unique, validation JWT, routage |

Chaque service possède sa **propre base PostgreSQL isolée** — aucune base partagée, aucune clé étrangère cross-service. Les services communiquent uniquement par UUID et appels HTTP internes.

Toutes les requêtes du frontend passent par le gateway (`http://localhost:8080`), jamais directement vers un microservice.

---

## Prérequis

| Outil | Version minimale | Vérifier avec |
|---|---|---|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 24+ | `docker --version` |
| [Docker Compose](https://docs.docker.com/compose/) | v2 (inclus dans Docker Desktop) | `docker compose version` |
| [Node.js](https://nodejs.org/) | 20 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| Git | — | `git --version` |

Docker Desktop doit être **lancé** avant toute commande `docker compose`.

---

## Installation rapide (Docker)

### 1. Cloner le dépôt

```bash
git clone https://github.com/HamzaOuba00-1/novacampus.git
cd novacampus
```


### 3. Démarrer tous les services

Toujours depuis `novacampus-api/` :

```bash
docker compose up -d --build
```

Cette commande construit les 8 images Docker, démarre 8 bases PostgreSQL + 8 microservices + le gateway NGINX. Le premier build prend quelques minutes.

### 4. Vérifier que tout est démarré

```bash
docker compose ps
```

Tous les services doivent afficher `Up` (et `healthy` pour les bases PostgreSQL). Si un service redémarre en boucle, voir la section [Dépannage](#dépannage).

---

## Peuplement des données (seed)

Une fois tous les conteneurs démarrés, peuplez chaque base avec des données de démonstration cohérentes (campus, comptes utilisateurs, cours, emplois du temps, factures, alertes IA…).

**L'ordre est important** — `campus-service` doit être seedé en premier car il définit les UUIDs de référence (campus, années académiques) utilisés par tous les autres services.

Depuis `novacampus-api/` :

```bash
docker compose exec campus-service npm run seed
docker compose exec auth-service npm run seed
docker compose exec academic-service npm run seed
docker compose exec planning-service npm run seed
docker compose exec inscription-service npm run seed
docker compose exec payment-service npm run seed
docker compose exec notification-service npm run seed
docker compose exec reporting-service npm run seed
```

Chaque commande affiche un résumé des données créées (UUIDs, comptes, statistiques). Les seeds sont **idempotents** : les relancer ne duplique rien, ils ignorent ce qui existe déjà.

---

## Lancer le frontend

Dans un **second terminal**, à la racine du repo :

```bash
cd novacampus-frontend


# Installation des dépendances
npm install

# Démarrage en mode développement
npm run dev
```

L'application est accessible sur **http://localhost:3000**.

Le frontend communique exclusivement avec le gateway sur `http://localhost:8080` (configuré dans `.env.local` via `NEXT_PUBLIC_GATEWAY_URL`) — assurez-vous que `docker compose up` tourne toujours dans l'autre terminal.

---

## Comptes de test

Après le seed, ces comptes sont disponibles sur la page de connexion (`/auth/login`) :

| Rôle | Email | Mot de passe |
|---|---|---|
| Étudiant | `etudiant.dupont@etu.novacampus.fr` | `Student123!` |
| Enseignant | `prof.mercier@novacampus.fr` | `Instructor123!` |
| Administrateur | `admin@novacampus.fr` | `Admin123!` |
| Direction | `direction@novacampus.fr` | `Direction123!` |

**Étudiant (Camille Dupont)** : inscrite à 3 cours sur 2 semestres, notes variées, 4 absences sur un cours (taux 76,47 % — déclenche l'alerte), 11 ressources pédagogiques téléchargeables, 4 deadlines à venir.

**Enseignant (Jean-Baptiste Mercier)** : emploi du temps avec créneaux Lundi/Mardi/Jeudi/Vendredi, accès à la saisie d'absences par créneau depuis `/instructor/schedules`.

---

## Installation sans Docker (dev local)

Pour travailler service par service sans conteneuriser, par exemple pour déboguer avec `ts-node-dev` :

### 1. PostgreSQL local

Installez PostgreSQL 16 localement, ou lancez uniquement les bases via Docker :

```bash
cd novacampus-api
docker compose up -d auth-postgres academic-postgres planning-postgres inscription-postgres payment-postgres notification-postgres campus-postgres reporting-postgres
```

### 2. Adapter les `.env`

Dans chaque `.env`, remplacez `DB_HOST=<nom-du-service>` par :

```env
DB_HOST=localhost
```

(les `.env.example` fournis ont déjà `DB_HOST=localhost` par défaut — adaptés au mode local).

### 3. Installer et lancer chaque service

Dans un terminal par service (8 terminaux, ou utilisez un multiplexeur comme `tmux`) :

```bash
cd auth-service
npm install
npm run dev
```

Répétez pour `academic-service`, `planning-service`, `inscription-service`, `payment-service`, `notification-service`, `campus-service`, `reporting-service`.

### 4. Gateway en local

Le gateway NGINX peut tourner en Docker même si les services tournent en local — adaptez `gateway/nginx.conf` pour pointer vers `host.docker.internal:<port>` au lieu des noms de service Docker, ou installez NGINX localement avec la même configuration.

---

## Vérifier que tout fonctionne

Health check de chaque service via le gateway :

```bash
curl http://localhost:8080/api/auth/health
curl http://localhost:8080/api/academic/health
curl http://localhost:8080/api/planning/health
curl http://localhost:8080/api/inscription/health
curl http://localhost:8080/api/payment/health
curl http://localhost:8080/api/notification/health
curl http://localhost:8080/api/campus/health
curl http://localhost:8080/api/reporting/health
```

Chaque appel doit retourner `{"status":"UP", ...}`.

Test de connexion complet :

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"etudiant.dupont@etu.novacampus.fr","password":"Student123!"}'
```

Doit retourner un `accessToken` et un `refreshToken`.

---

## Arrêter / réinitialiser

**Arrêter sans perdre les données :**

```bash
cd novacampus-api
docker compose stop
```

**Redémarrer après un arrêt :**

```bash
docker compose start
```

**Tout supprimer (conteneurs + données) pour repartir de zéro :**

```bash
docker compose down -v
```

Puis refaites `docker compose up -d --build` et relancez tous les seeds.

---

## Dépannage

**Un service redémarre en boucle (`Restarting`)**
```bash
docker compose logs -f <nom-du-service>
```
Cause fréquente : `JWT_SECRET` différent entre deux services, ou base PostgreSQL pas encore prête (le `healthcheck` du compose gère normalement ce cas, mais un premier démarrage long peut nécessiter `docker compose up -d --build` une seconde fois).

**`docker compose exec <service> npm run seed` échoue avec une erreur de connexion DB**
Le service n'est pas encore prêt. Attendez quelques secondes après `docker compose up -d` et réessayez, ou vérifiez `docker compose ps` pour confirmer que la base associée est `healthy`.

**Le frontend affiche des erreurs 401 ou 403 en boucle**
Vérifiez que `NEXT_PUBLIC_GATEWAY_URL` dans `novacampus-frontend/.env.local` pointe bien vers `http://localhost:8080`, et que le gateway tourne (`docker compose ps` doit montrer `gateway` à `Up`).

**Page vide pour un compte après le seed**
Si vous aviez déjà lancé les seeds avant une mise à jour du code, certains UUID fixes (notamment celui de l'enseignant Mercier) peuvent ne pas correspondre à ceux attendus par les autres services. Faites un reset complet :
```bash
docker compose down -v
docker compose up -d --build
```
puis relancez tous les seeds dans l'ordre indiqué plus haut.

**Port déjà utilisé (`port is already allocated`)**
Un autre processus utilise déjà un des ports 3001-3008 ou 8080. Libérez le port ou modifiez le mapping dans `compose.yml` (partie gauche du `ports:`, ex. `"3001:3001"` → `"3011:3001"`).

---

## Stack technique

**Backend** : Node.js 20, Express, TypeScript, Sequelize, PostgreSQL 16, JWT, NGINX (gateway + reverse proxy + WebSocket).

**Frontend** : Next.js (App Router), TypeScript, Tailwind CSS, Axios.

**Infrastructure** : Docker, Docker Compose, architecture microservices avec base de données dédiée par service.
