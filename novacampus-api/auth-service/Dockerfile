# ============================================================
# Étape 1 : Construction (build)
# On utilise une image complète pour compiler le TypeScript
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copier uniquement les fichiers de dépendances en premier
# pour bénéficier du cache Docker lors des builds successifs
COPY package*.json tsconfig.json ./

# Installer toutes les dépendances (y compris devDependencies pour tsc)
RUN npm install

# Copier les sources et compiler
COPY src/ ./src/
RUN npm run build

# ============================================================
# Étape 2 : Production
# On repart d'une image vierge pour minimiser la surface d'attaque
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app

# Copier uniquement les dépendances de production
COPY package*.json ./
RUN npm install --omit=dev

# Copier uniquement le code compilé depuis l'étape builder
COPY --from=builder /app/dist ./dist

# Exposer le port défini dans les variables d'environnement
EXPOSE 3001

# Lancer le serveur compilé
CMD ["node", "dist/index.js"]