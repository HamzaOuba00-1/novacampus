# ============================================================
# Étape 1 : Construction
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npm run build

# ============================================================
# Étape 2 : Production
# ============================================================
FROM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 3006

CMD ["node", "dist/index.js"]
