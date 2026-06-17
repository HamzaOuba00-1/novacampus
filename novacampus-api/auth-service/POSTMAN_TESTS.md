# Novacampus Auth Service – Guide de tests Postman

## Démarrage rapide

```bash
# 1. Démarrer les services
docker compose up -d --build

# 2. Peupler la base avec les utilisateurs de test
docker compose exec auth-service npm run seed

# 3. Vérifier que tout est UP
curl http://localhost:3001/api/health
curl http://localhost:8080/health
```

---

## Comptes de test disponibles après la seed

| Email | Mot de passe | Rôle |
|---|---|---|
| `admin@novacampus.fr` | `Admin123!` | admin |
| `direction@novacampus.fr` | `Direction123!` | direction |
| `prof.mercier@novacampus.fr` | `Instructor123!` | instructor |
| `etudiant.dupont@etu.novacampus.fr` | `Student123!` | student |

---

## Tests Postman – étape par étape

### Base URL
- **Accès direct (dev)** : `http://localhost:3001`
- **Via gateway NGINX** : `http://localhost:8080`

---

### 1. Health check

**GET** `{{baseUrl}}/api/health`

Résultat attendu :
```json
{
  "status": "UP",
  "service": "auth-service",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

---

### 2. Inscription – POST /api/auth/register

**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
  "email": "nouveau@test.fr",
  "password": "Test1234!",
  "role": "student"
}
```

**Résultat attendu (201 Created) :**
```json
{
  "status": "success",
  "data": {
    "id": "uuid-généré",
    "email": "nouveau@test.fr",
    "role": "student"
  }
}
```

**Test d'erreur – email déjà utilisé (400) :**
Relancer la même requête → `"Un compte avec cet email existe déjà."`

**Test d'erreur – mot de passe trop faible (400) :**
```json
{ "email": "test2@test.fr", "password": "abc" }
```

---

### 3. Connexion – POST /api/auth/login

**Headers :**
```
Content-Type: application/json
```

**Body :**
```json
{
  "email": "admin@novacampus.fr",
  "password": "Admin123!"
}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ...",
    "user": {
      "id": "uuid",
      "email": "admin@novacampus.fr",
      "role": "admin"
    }
  }
}
```

> Copier l'`accessToken` et le `refreshToken` pour les tests suivants.
> Dans Postman : créer des variables d'environnement `accessToken` et `refreshToken`.

**Test d'erreur – mauvais mot de passe (401) :**
```json
{ "email": "admin@novacampus.fr", "password": "mauvais" }
```

---

### 4. Profil connecté – GET /api/auth/me

**Headers :**
```
Authorization: Bearer {{accessToken}}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "email": "admin@novacampus.fr",
    "role": "admin"
  }
}
```

**Test d'erreur – sans token (401) :**
Supprimer le header Authorization → `"Token d'authentification manquant."`

**Test d'erreur – token invalide (401) :**
```
Authorization: Bearer tokenbidoninvalide
```

---

### 5. Validation interne gateway – GET /api/auth/validate

**Headers :**
```
Authorization: Bearer {{accessToken}}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "message": "Token valide.",
  "data": { "id": "...", "email": "...", "role": "admin" }
}
```

---

### 6. Sessions actives – GET /api/auth/sessions

**Headers :**
```
Authorization: Bearer {{accessToken}}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "data": {
    "sessions": [
      {
        "id": "uuid-session",
        "deviceInfo": { "userAgent": "PostmanRuntime/...", "ip": "..." },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "expiresAt": "2024-01-22T10:00:00.000Z"
      }
    ]
  }
}
```

---

### 7. Renouvellement de tokens – POST /api/auth/refresh

**Headers :**
```
Content-Type: application/json
```

**Body :**
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "data": {
    "accessToken": "nouveau_access_token...",
    "refreshToken": "nouveau_refresh_token..."
  }
}
```

> Mettre à jour les variables Postman avec les nouveaux tokens.
> L'ancien refreshToken est maintenant invalide (rotation).

---

### 8. Changement de mot de passe – PATCH /api/auth/me/password

**Headers :**
```
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

**Body :**
```json
{
  "currentPassword": "Admin123!",
  "newPassword": "NewAdmin456!"
}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "message": "Mot de passe modifié. Veuillez vous reconnecter."
}
```

> Toutes les sessions sont révoquées. Relancer un login.

---

### 9. Déconnexion session courante – POST /api/auth/logout

**Headers :**
```
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

**Body :**
```json
{
  "refreshToken": "{{refreshToken}}"
}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "message": "Déconnexion réussie."
}
```

> Réutiliser le même refreshToken → erreur `"Token introuvable ou déjà révoqué."`

---

### 10. Déconnexion globale – POST /api/auth/logout-all

**Headers :**
```
Authorization: Bearer {{accessToken}}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "message": "Toutes les sessions ont été révoquées."
}
```

---

### 11. Lister les utilisateurs – GET /api/users (admin requis)

**Headers :**
```
Authorization: Bearer {{accessToken_admin}}
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "data": {
    "users": [...],
    "total": 4,
    "page": 1,
    "totalPages": 1
  }
}
```

**Test de filtres :**
```
GET /api/users?role=student&page=1&limit=10
GET /api/users?isActive=true
```

**Test d'erreur – rôle insuffisant (403) :**
Utiliser le token d'un `student` → `"Accès refusé. Rôles autorisés : admin, direction."`

---

### 12. Désactiver un compte – PATCH /api/users/:id/activate

**Headers :**
```
Authorization: Bearer {{accessToken_admin}}
Content-Type: application/json
```

**Body :**
```json
{ "isActive": false }
```

**Résultat attendu (200 OK) :**
```json
{
  "status": "success",
  "message": "Compte désactivé avec succès."
}
```

**Vérification :** Tenter de se connecter avec le compte désactivé → `"Ce compte a été désactivé."`

---

## Collection Postman – import JSON

Sauvegarder le JSON ci-dessous dans un fichier `novacampus-auth.postman_collection.json` et l'importer dans Postman :

```json
{
  "info": {
    "name": "Novacampus Auth Service",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3001" },
    { "key": "accessToken", "value": "" },
    { "key": "refreshToken", "value": "" }
  ],
  "item": [
    {
      "name": "Health",
      "request": { "method": "GET", "url": "{{baseUrl}}/api/health" }
    },
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/register",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"email\":\"test@test.fr\",\"password\":\"Test1234!\",\"role\":\"student\"}" }
      }
    },
    {
      "name": "Login",
      "event": [{
        "listen": "test",
        "script": { "exec": [
          "const r = pm.response.json();",
          "if(r.data) {",
          "  pm.collectionVariables.set('accessToken', r.data.accessToken);",
          "  pm.collectionVariables.set('refreshToken', r.data.refreshToken);",
          "}"
        ]}
      }],
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/login",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"email\":\"admin@novacampus.fr\",\"password\":\"Admin123!\"}" }
      }
    },
    {
      "name": "Get Me",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/auth/me",
        "header": [{ "key": "Authorization", "value": "Bearer {{accessToken}}" }]
      }
    },
    {
      "name": "Sessions",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/auth/sessions",
        "header": [{ "key": "Authorization", "value": "Bearer {{accessToken}}" }]
      }
    },
    {
      "name": "Refresh",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/refresh",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": { "mode": "raw", "raw": "{\"refreshToken\":\"{{refreshToken}}\"}" }
      }
    },
    {
      "name": "Logout",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/auth/logout",
        "header": [
          { "key": "Authorization", "value": "Bearer {{accessToken}}" },
          { "key": "Content-Type", "value": "application/json" }
        ],
        "body": { "mode": "raw", "raw": "{\"refreshToken\":\"{{refreshToken}}\"}" }
      }
    },
    {
      "name": "Validate (gateway)",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/auth/validate",
        "header": [{ "key": "Authorization", "value": "Bearer {{accessToken}}" }]
      }
    },
    {
      "name": "List Users (admin)",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/users",
        "header": [{ "key": "Authorization", "value": "Bearer {{accessToken}}" }]
      }
    }
  ]
}
```
