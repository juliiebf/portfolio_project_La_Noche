# 🎤 La Noche - Backend Complet Fusionné

Backend Node.js + PostgreSQL + Stripe avec **authentification complète** et **système de paiement** pour privatisation du bar karaoké.

## 🎯 Contenu Fusionné

**Partie 1 (Login/Auth)** ✅
- ✅ Register utilisateur
- ✅ Login JWT sécurisé
- ✅ Récupération profil utilisateur
- ✅ Table users avec rôles (client/admin/staff)

**Partie 2 (Paiement Stripe)** ✅
- ✅ Calcul tarif dynamique
- ✅ Création réservation avec paiement Stripe
- ✅ Webhooks Stripe sécurisés
- ✅ Gestion des paiements
- ✅ Admin dashboard statistiques

## 🚀 Démarrage Rapide

### 1. Installation
```bash
cd la-noche-backend-merged
npm install
```

### 2. Configuration `.env`
```bash
cp .env.example .env
# Éditer .env avec vos valeurs :
# - PostgreSQL credentials
# - Stripe keys (sk_test/pk_test)
# - Port, JWT secret, etc.
```

### 3. PostgreSQL
```bash
sudo -u postgres psql
CREATE DATABASE lanoche;
CREATE USER lanocheuser WITH PASSWORD 'yourPassword';
GRANT ALL PRIVILEGES ON DATABASE lanoche TO lanocheuser;
\c lanoche
GRANT ALL ON SCHEMA public TO lanocheuser;
\q
```

### 4. Initialiser DB
```bash
npm run init-db
```

### 5. Démarrer le serveur
```bash
npm start
# ou en dev avec nodemon :
npm run dev
```

## 🔌 API Endpoints

### Authentification

**POST /api/auth/register**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "nom": "Dupont",
  "prenom": "Jean"
}
```

**POST /api/auth/login**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**GET /api/auth/me** (protégé - Bearer token)
Récupérer le profil de l'utilisateur connecté

**POST /api/auth/logout** (protégé)

### Paiement

**POST /api/payment/calculate**
```json
{
  "nombre_personnes": 25
}
```
Retourne : montant base + montant par personne + total

**POST /api/payment/create-reservation**
```json
{
  "nom": "Jean Dupont",
  "email": "jean@example.com",
  "telephone": "0612345678",
  "date_reservation": "2025-11-15",
  "heure_reservation": "20:00",
  "nombre_personnes": 25,
  "commentaires": "Anniversaire"
}
```
Retourne : URL Stripe Checkout

**GET /api/payment/session/:sessionId**
Vérifier le statut d'un paiement

**POST /api/webhooks/stripe**
Webhook Stripe (automatique)

### Admin (protégé - rôle admin)

**GET /api/admin/reservations**
Liste toutes les réservations avec paiements

**GET /api/admin/stats**
Statistiques : total réservations, paiements réussis, chiffre d'affaires

## 🗄️ Structure Base Données

### Table `users`
- id, email (UNIQUE), password_hash
- nom, prenom, telephone
- role ('client', 'admin', 'staff')
- is_active, created_at, last_login

### Table `reservations`
- id, nom, email, telephone
- date_reservation, heure_reservation
- nombre_personnes, commentaires
- type_reservation ('privatisation')
- statut ('en_attente', 'paiement_en_cours', 'payee', 'confirmee', 'annulee')

### Table `paiements`
- id, reservation_id (FK), stripe_session_id
- montant_total, email_client
- statut_paiement ('pending', 'succeeded', 'failed')
- date_paiement

## 💳 Configuration Stripe

1. Créer compte : https://dashboard.stripe.com
2. Récupérer clés API (Dashboard > Developers > API keys)
3. Copier dans `.env` :
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## 🧪 Test Webhook Stripe en Local

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Écouter les webhooks
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Dans un autre terminal, déclencher un événement de test
stripe trigger checkout.session.completed
```

## 🔐 Sécurité

- ✅ Authentification JWT
- ✅ Hachage bcrypt pour mots de passe
- ✅ Rate limiting sur authentification
- ✅ Validation stricte des données
- ✅ CORS configuré
- ✅ Helmet security headers
- ✅ Webhooks Stripe vérifiés
- ✅ Tokens expiration 24h

## 📊 Variables d'Environnement

```env
# Serveur
PORT=3001
NODE_ENV=development

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=lanoche
POSTGRES_USER=lanocheuser
POSTGRES_PASSWORD=yourPassword

# JWT & Security
JWT_SECRET=your-secret-key-256-bits
SESSION_SECRET=your-session-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Tarification
PRIVATISATION_BASE_PRICE=500
PRIVATISATION_PRICE_PER_PERSON=20
```

## 🛠️ Dépendances Principales

- **express** : Framework web
- **pg** : PostgreSQL client
- **stripe** : API Stripe
- **bcrypt** : Hachage mots de passe
- **jsonwebtoken** : JWT authentication
- **cors** : Cross-origin requests
- **helmet** : Security headers
- **express-validator** : Validation
- **express-rate-limit** : Rate limiting

## 📝 Scripts

```bash
npm start        # Démarrer le serveur
npm run dev      # Démarrer avec nodemon
npm run init-db  # Initialiser la base de données
```

## 🚀 Déploiement Production

1. Changer NODE_ENV en 'production'
2. Générer nouvelles clés secrets (JWT, session)
3. Configurer HTTPS/SSL
4. Utiliser clés Stripe LIVE (sk_live_, pk_live_)
5. Déployer sur cloud (Heroku, Railway, etc.)

## 📞 Problèmes Courants

### "Route non trouvée"
- Vérifier que le serveur est bien lancé
- Vérifier l'URL et la méthode HTTP (GET, POST, etc.)

### "Token invalide"
- Token expiré (24h) → relancer login
- Mauvais JWT_SECRET dans .env

### "Email ou mot de passe incorrect"
- Vérifier les identifiants
- Vérifier que l'utilisateur existe en base

### "Stripe session not found"
- Session a expiré (30 minutes)
- Utiliser le bon session_id retourné par create-reservation

## 🎉 Vous Êtes Prêt !

Votre API La Noche est maintenant **complète**, **sécurisée** et **prête pour le déploiement** ! 🚀

---

© 2025 La Noche - Backend Complet Fusionné
