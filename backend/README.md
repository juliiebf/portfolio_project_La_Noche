# 🎤 Karaoke Bar - Application Web

Application web complète pour la gestion d'un bar karaoké avec système d'authentification, réservations et gestion des utilisateurs.

## 📋 Table des matières

- [Technologies utilisées](#technologies-utilisées)
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Structure du projet](#structure-du-projet)
- [API Endpoints](#api-endpoints)
- [Base de données](#base-de-données)
- [Sécurité](#sécurité)
- [Utilisation](#utilisation)

## 🛠️ Technologies utilisées

### Backend
- **Node.js** - Environnement d'exécution JavaScript
- **Express.js** - Framework web minimaliste
- **PostgreSQL** - Base de données relationnelle
- **JWT (jsonwebtoken)** - Authentification par tokens
- **bcrypt** - Hashage sécurisé des mots de passe
- **pg (node-postgres)** - Client PostgreSQL pour Node.js

### Frontend
- HTML5 / CSS3 / JavaScript

## ✨ Fonctionnalités

- ✅ Inscription et connexion d'utilisateurs
- ✅ Authentification sécurisée avec JWT
- ✅ Hashage des mots de passe avec bcrypt
- ✅ Gestion du profil utilisateur
- ✅ Protection des routes avec middleware d'authentification
- ✅ Validation des données côté serveur
- ✅ Sessions utilisateur avec expiration (24h)

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- [Node.js](https://nodejs.org/) (version 14 ou supérieure)
- [PostgreSQL](https://www.postgresql.org/) (version 12 ou supérieure)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)

## 🚀 Installation

1. **Installer les dépendances**
```bash
npm install
```

2. **Créer la base de données PostgreSQL**
```bash
psql -U postgres
CREATE DATABASE karaoke_bar;
\c karaoke_bar
```

3. **Créer la table users**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

4. **Configurer les variables d'environnement** (voir section Configuration)

5. **Démarrer le serveur**
```bash
npm start
# ou en mode développement
npm run dev
```

Le serveur devrait démarrer sur `http://localhost:3000`

## ⚙️ Configuration

Créez un fichier `.env` à la racine du projet :

```env
# Base de données
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
DB_NAME=karaoke_bar

# JWT
JWT_SECRET=votre_secret_jwt_ultra_securise_changez_moi

# Serveur
PORT=3000
NODE_ENV=development
```

⚠️ **Important** : Ne jamais commiter le fichier `.env` ! Ajoutez-le à `.gitignore`


## 🔌 API Endpoints

### Authentification

#### POST `/api/auth/register`
Inscription d'un nouvel utilisateur

**Body :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123",
  "nom": "Dupont",
  "prenom": "Jean"
}
```

**Réponse (201) :**
```json
{
  "message": "Utilisateur créé avec succès",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Dupont",
    "prenom": "Jean"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST `/api/auth/login`
Connexion d'un utilisateur existant

**Body :**
```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Réponse (200) :**
```json
{
  "message": "Connexion réussie",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Dupont",
    "prenom": "Jean"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET `/api/auth/me`
Récupérer les informations de l'utilisateur connecté

**Headers :**
```
Authorization: Bearer <token>
```

**Réponse (200) :**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nom": "Dupont",
    "prenom": "Jean",
    "created_at": "2025-01-15T10:30:00.000Z",
    "last_login": "2025-01-20T14:45:00.000Z"
  }
}
```

#### POST `/api/auth/logout`
Déconnexion de l'utilisateur

**Headers :**
```
Authorization: Bearer <token>
```

**Réponse (200) :**
```json
{
  "message": "Déconnexion réussie"
}
```

## 💾 Base de données

### Schéma de la table `users`

| Colonne        | Type         | Description                           |
|----------------|--------------|---------------------------------------|
| id             | SERIAL       | Identifiant unique (clé primaire)     |
| email          | VARCHAR(255) | Email de l'utilisateur (unique)       |
| password_hash  | VARCHAR(255) | Mot de passe hashé avec bcrypt        |
| nom            | VARCHAR(100) | Nom de famille                        |
| prenom         | VARCHAR(100) | Prénom                                |
| created_at     | TIMESTAMP    | Date de création du compte            |
| last_login     | TIMESTAMP    | Date de dernière connexion            |

## 🔒 Sécurité

### Mesures de sécurité implémentées

- **Hashage des mots de passe** : Utilisation de bcrypt avec 10 salt rounds
- **JWT** : Tokens avec expiration de 24h
- **Validation des entrées** : 
  - Format email vérifié avec regex
  - Mot de passe minimum 6 caractères
  - Tous les champs obligatoires
- **Protection CSRF** : Messages d'erreur génériques pour le login
- **Emails normalisés** : Conversion en minuscules pour éviter les doublons
- **Variables d'environnement** : Secrets stockés dans `.env`
- **Middleware d'authentification** : Routes protégées nécessitent un token valide

### Bonnes pratiques recommandées

- [ ] Ajouter HTTPS en production
- [ ] Implémenter un rate limiting (express-rate-limit)
- [ ] Ajouter des logs de sécurité
- [ ] Configurer CORS correctement
- [ ] Utiliser helmet.js pour les headers de sécurité
- [ ] Ajouter une validation côté client
- [ ] Implémenter la confirmation d'email
- [ ] Ajouter une récupération de mot de passe

## 📖 Utilisation

### Exemple avec cURL

**Inscription :**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "nom": "Test",
    "prenom": "User"
  }'
```

**Connexion :**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Récupérer son profil :**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

### Exemple JavaScript (Frontend)

```javascript
// Inscription
async function register() {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123',
      nom: 'Dupont',
      prenom: 'Jean'
    })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
}

// Connexion
async function login() {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password123'
    })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
}

// Requête authentifiée
async function getProfile() {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  console.log(data.user);
}
```

## 🐛 Dépannage

### Erreur "Connection refused"
- Vérifiez que le serveur est démarré (`npm start`)
- Vérifiez le port dans le fichier `.env`

### Erreur "Cannot GET /"
- Ajoutez une route racine dans `server.js` ou servez des fichiers statiques

### Erreur de connexion à la base de données
- Vérifiez que PostgreSQL est démarré
- Vérifiez les credentials dans `.env`
- Testez la connexion : `psql -U postgres -d karaoke_bar`

### Token invalide ou expiré
- Les tokens JWT expirent après 24h
- Reconnectez-vous pour obtenir un nouveau token

## 📝 Scripts npm

```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "test": "jest"
}
```



## 👤 Auteur

 Julie , Arnaud , Najwa , Nils

## 🔮 Fonctionnalités futures

- [ ] Système de réservation de créneaux karaoké
- [ ] Catalogue de chansons avec recherche
- [ ] Gestion des playlists
- [ ] Système de notation des performances
- [ ] Interface d'administration
- [ ] Paiement en ligne
- [ ] Notifications par email
- [ ] Chat en temps réel
- [ ] Upload de chansons personnalisées
