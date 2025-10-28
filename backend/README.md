# 🐘 La Noche - Backend PostgreSQL

Backend Node.js avec PostgreSQL pour la gestion des réservations du karaoké La Noche.

## 🚀 Installation

### Prérequis
- Node.js 16+ installé
- PostgreSQL 12+ installé et démarré
- npm ou yarn

### 1. Installation des dépendances
```bash
cd la-noche-backend-postgresql
npm install
```

### 2. Configuration PostgreSQL

#### Créer la base de données et l'utilisateur
```sql
-- Se connecter à PostgreSQL
psql -U postgres

-- Créer la base et l'utilisateur
CREATE DATABASE lanoche;
CREATE USER lanocheuser WITH ENCRYPTED PASSWORD 'yourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE lanoche TO lanocheuser;

-- Se connecter à la base
\c lanoche

-- Donner les permissions sur le schéma public
GRANT ALL ON SCHEMA public TO lanocheuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lanocheuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lanocheuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lanocheuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lanocheuser;
```

### 3. Configuration de l'environnement
```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env
```

Configurer les variables PostgreSQL :
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=lanoche
POSTGRES_USER=lanocheuser
POSTGRES_PASSWORD=yourStrongPassword123!
```

### 4. Initialiser la base de données
```bash
npm run init-db
```

Ce script va créer :
- ✅ Table `reservations` avec contraintes
- ✅ Table `users` pour l'authentification
- ✅ Table `audit_log` pour l'audit trail
- ✅ Table `login_attempts` pour la sécurité
- ✅ Index pour les performances
- ✅ Triggers pour les mises à jour
- ✅ Utilisateur admin par défaut

### 5. Démarrer le serveur
```bash
# Mode production
npm start

# Mode développement (avec nodemon)
npm run dev
```

Le serveur démarre sur : `http://localhost:3001`

## 📊 Structure de la Base PostgreSQL

### Table `reservations`
```sql
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  telephone VARCHAR(20) NOT NULL,
  date_reservation DATE NOT NULL,
  heure_reservation TIME NOT NULL,
  nombre_personnes INTEGER NOT NULL CHECK (nombre_personnes >= 1 AND nombre_personnes <= 20),
  commentaires TEXT,
  statut VARCHAR(20) DEFAULT 'en_attente',
  ip_address VARCHAR(45),
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Contraintes** :
- `nom` : 2-100 caractères
- `email` : format email valide
- `telephone` : 10+ caractères
- `date_reservation` : date future obligatoire
- `nombre_personnes` : entre 1 et 20
- `statut` : 'en_attente', 'confirmee' ou 'annulee'

### Table `users`
Pour l'authentification admin avec :
- Hash bcrypt des mots de passe
- Système de verrouillage après tentatives échouées
- Tracking de la dernière connexion

### Table `audit_log`
Logs de toutes les modifications avec :
- Table concernée
- Type d'opération (INSERT/UPDATE/DELETE)
- Anciennes et nouvelles valeurs (JSONB)
- Utilisateur et IP

## 🔌 API Endpoints

### Authentification

#### `POST /api/auth/login`
Connexion admin avec JWT
```json
{
  "username": "admin",
  "password": "AdminLaNoche2025!"
}
```

**Réponse** :
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "username": "admin", "role": "admin" }
}
```

#### `POST /api/auth/logout`
Déconnexion (détruit la session)

#### `GET /api/auth/status`
Vérifier si le token est valide (requiert authentification)

### Réservations

#### `GET /api/reservations` 🔐
Liste toutes les réservations (admin uniquement)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/reservations
```

#### `POST /api/reservations` 🌐
Créer une réservation (public, rate limited)
```json
{
  "nom": "Jean Dupont",
  "email": "jean@example.com",
  "telephone": "0612345678",
  "date_reservation": "2025-10-30",
  "heure_reservation": "23:00",
  "nombre_personnes": 4,
  "commentaires": "Anniversaire"
}
```

#### `GET /api/reservations/:id` 🔐
Récupérer une réservation par ID (admin)

#### `PUT /api/reservations/:id` 🔐
Modifier une réservation (admin)

#### `DELETE /api/reservations/:id` 🔐
Supprimer une réservation (admin)

#### `GET /api/stats` 🔐
Statistiques des réservations (admin)
```json
{
  "success": true,
  "data": {
    "total": 25,
    "enAttente": 5,
    "confirmees": 18,
    "aujourdhui": 3
  }
}
```

#### `GET /api/test` 🌐
Test de connexion API (public)

## 🛡️ Sécurité

### Protections implémentées
- **JWT Authentication** - Tokens expiration 24h
- **Bcrypt Hashing** - 12 rounds pour les mots de passe
- **Rate Limiting** - 100 req/15min général, 50 req/15min API
- **Slow Down** - Ralentissement après 10 requêtes
- **Brute Force Protection** - Verrouillage après 5 tentatives
- **Input Validation** - Express-validator stricte
- **SQL Injection Protection** - Requêtes paramétrées
- **XSS Protection** - Helmet + sanitization
- **CORS** - Origines restreintes
- **Sessions sécurisées** - Stockées en PostgreSQL
- **Audit Trail** - Logs de toutes modifications

### Anti-spam
- Maximum 3 réservations par IP par heure
- Tracking de l'IP dans la base
- Limite de créneaux par heure (3 max)

### Logging
- Toutes les requêtes HTTP loggées
- Tentatives de login trackées
- Modifications en base auditées
- Erreurs détaillées pour débogage

## 🔧 Configuration Avancée

### Pool de connexions PostgreSQL
```env
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT_MS=30000
POSTGRES_CONNECTION_TIMEOUT_MS=2000
```

### Sessions
- Stockées dans PostgreSQL (table `session`)
- Timeout configurable (défaut 24h)
- Cookies sécurisés en production

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=100
MAX_RESERVATIONS_PER_IP_HOUR=3
```

## 🐛 Résolution de problèmes

### Erreur de connexion PostgreSQL
```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql

# Vérifier les permissions
psql -U lanocheuser -d lanoche -c "SELECT version();"
```

### Erreur "permission denied for schema public"
```sql
-- Se connecter en tant que postgres
psql -U postgres -d lanoche

-- Donner les permissions
GRANT ALL ON SCHEMA public TO lanocheuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lanocheuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lanocheuser;
```

### Réinitialiser la base
```bash
# Supprimer la base
psql -U postgres -c "DROP DATABASE lanoche;"

# Recréer
psql -U postgres -c "CREATE DATABASE lanoche;"
psql -U postgres -d lanoche -c "GRANT ALL ON SCHEMA public TO lanocheuser;"

# Réinitialiser
npm run init-db
```

## 📈 Avantages PostgreSQL vs SQLite

✅ **Scalabilité** - Supporte des milliers de connexions simultanées  
✅ **Concurrence** - MVCC pour les accès simultanés  
✅ **Fonctionnalités avancées** - JSONB, full-text search, triggers  
✅ **Réplication** - Master-slave pour la haute disponibilité  
✅ **Performances** - Index avancés, query planner optimisé  
✅ **Cloud ready** - Compatible AWS RDS, Google Cloud SQL, Azure  

## 🌐 Déploiement

### Variables d'environnement production
```env
NODE_ENV=production
POSTGRES_HOST=your-db-host.com
POSTGRES_SSL=true
JWT_SECRET=<générer-clé-256-bits>
SESSION_SECRET=<générer-clé-256-bits>
CORS_ORIGINS=https://lanoche-paris.fr
```

### Hébergement recommandé
- **Heroku** avec addon PostgreSQL
- **Railway** avec PostgreSQL intégré
- **AWS** RDS PostgreSQL + EC2
- **DigitalOcean** Managed PostgreSQL + Droplet

## 📞 Support

La Noche - 42 Rue des Martyrs, 75009 Paris  
Email : contact@lanoche-paris.fr  
Téléphone : 01 42 82 42 82

---

© 2025 La Noche - Backend PostgreSQL
