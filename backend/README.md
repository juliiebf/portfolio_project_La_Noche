# 🎤 La Noche - Backend API avec SQLite3

Backend Node.js pour la gestion des réservations du karaoké La Noche avec base de données SQLite3.

## 🚀 Installation et Démarrage

### 1. Installation des dépendances
```bash
cd la-noche-backend
npm install
```

### 2. Initialisation de la base de données
```bash
npm run init-db
```

### 3. Démarrage du serveur
```bash
# Mode production
npm start

# Mode développement (avec nodemon)
npm run dev
```

Le serveur démarre sur : `http://localhost:3001`

## 📊 Base de Données SQLite3

### Structure des tables

#### Table `reservations`
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `nom` - TEXT NOT NULL
- `email` - TEXT NOT NULL  
- `telephone` - TEXT NOT NULL
- `date_reservation` - DATE NOT NULL
- `heure_reservation` - TIME NOT NULL
- `nombre_personnes` - INTEGER NOT NULL
- `commentaires` - TEXT (optionnel)
- `statut` - TEXT DEFAULT 'en_attente'
- `date_creation` - DATETIME DEFAULT CURRENT_TIMESTAMP
- `date_modification` - DATETIME DEFAULT CURRENT_TIMESTAMP

#### Statuts possibles
- `en_attente` - Réservation reçue, en attente de confirmation
- `confirmee` - Réservation confirmée par l'établissement
- `annulee` - Réservation annulée

### Emplacement de la DB
La base de données est créée dans : `./database/lanoche.db`

## 🔌 API Endpoints

### Réservations

#### `GET /api/reservations`
Récupère toutes les réservations (pour administration)
```json
{
  "success": true,
  "data": [...],
  "count": 15
}
```

#### `POST /api/reservations`
Crée une nouvelle réservation
```json
{
  "nom": "Jean Dupont",
  "email": "jean@example.com",
  "telephone": "0612345678",
  "date_reservation": "2025-10-20",
  "heure_reservation": "23:00",
  "nombre_personnes": 4,
  "commentaires": "Anniversaire"
}
```

#### `GET /api/reservations/:id`
Récupère une réservation par ID

#### `PUT /api/reservations/:id`
Modifie une réservation existante

#### `DELETE /api/reservations/:id`
Supprime une réservation

### Statistiques

#### `GET /api/stats`
Récupère les statistiques des réservations
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

### Test

#### `GET /api/test`
Test de connexion API
```json
{
  "message": "🎤 API La Noche fonctionnelle !",
  "timestamp": "2025-10-17T14:30:00.000Z",
  "status": "OK"
}
```

## 🔒 Sécurité

### Fonctionnalités intégrées
- **Helmet** - Protection des headers HTTP
- **CORS** - Configuration cross-origin
- **Rate Limiting** - 100 requêtes/15min par IP
- **Validation** - Validation des données avec express-validator
- **Sanitization** - Nettoyage des entrées utilisateur

### Validations
- Email valide requis
- Téléphone français requis
- Date dans le futur obligatoire
- Nombre de personnes entre 1 et 20
- Protection contre les injections

## 🛠️ Administration

### Page d'administration
Accéder à : `http://localhost:3001/admin.html`

Fonctionnalités :
- ✅ Visualisation des statistiques
- ✅ Liste des réservations en temps réel
- ✅ Suppression des réservations
- 🚧 Export CSV (à implémenter)
- 🚧 Modification du statut (à implémenter)

## 🔧 Configuration

### Variables d'environnement
Créer un fichier `.env` :
```env
PORT=3001
DB_PATH=./database/lanoche.db
NODE_ENV=development
```

### Ports utilisés
- **3001** - API Backend
- **3000** - Frontend (si servi séparément)

## 📁 Structure du projet

```
la-noche-backend/
├── server.js              # Serveur Express principal
├── init-database.js       # Script d'initialisation DB
├── package.json           # Dépendances Node.js
├── admin.html             # Interface d'administration
├── database/              # Dossier base de données
│   └── lanoche.db        # Base SQLite3
└── README.md             # Cette documentation
```

## 🐛 Résolution de problèmes

### Erreur "Database locked"
```bash
# Redémarrer le serveur
npm run dev
```

### Erreur "CORS"
Vérifier que le frontend utilise les bonnes URLs d'API dans le JavaScript.

### Base de données corrompue
```bash
# Supprimer et recréer
rm -rf database/
npm run init-db
```

## 📞 Support

La Noche - 42 Rue des Martyrs, 75009 Paris  
Email : contact@lanoche-paris.fr  
Téléphone : 01 42 82 42 82

---

© 2025 La Noche - Backend API avec SQLite3
