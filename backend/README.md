# 💳 La Noche - Backend avec Paiement Stripe

Backend Node.js + PostgreSQL avec intégration **Stripe** pour les paiements de privatisation du bar.

## 🚀 Fonctionnalités

- ✅ **Réservations standard** (gratuites)
- ✅ **Privatisations payantes** via Stripe Checkout
- ✅ **Calcul automatique** des tarifs (base + par personne)
- ✅ **Webhooks Stripe** pour confirmation automatique
- ✅ **Remboursements** depuis le panel admin
- ✅ **Statistiques** avec chiffre d'affaires
- ✅ **Sécurité** : JWT, rate limiting, validation

## 📦 Installation

### 1. Prérequis
- Node.js 16+
- PostgreSQL 12+
- Compte Stripe (gratuit en mode test)

### 2. Installation des dépendances
\`\`\`bash
cd la-noche-backend-stripe
npm install
\`\`\`

### 3. Configuration PostgreSQL
\`\`\`sql
CREATE DATABASE lanoche;
CREATE USER lanocheuser WITH ENCRYPTED PASSWORD 'yourPassword';
GRANT ALL PRIVILEGES ON DATABASE lanoche TO lanocheuser;
\c lanoche
GRANT ALL ON SCHEMA public TO lanocheuser;
\`\`\`

### 4. Configuration Stripe

#### Créer un compte Stripe
1. Aller sur https://dashboard.stripe.com/register
2. Créer un compte (gratuit)
3. Activer le mode test

#### Récupérer les clés API
1. Aller dans **Developers** > **API keys**
2. Copier :
   - **Publishable key** (pk_test_...)
   - **Secret key** (sk_test_...)

#### Configurer le webhook
1. Aller dans **Developers** > **Webhooks**
2. Cliquer **Add endpoint**
3. URL : \`https://votre-domaine.com/api/webhooks/stripe\`
4. Événements à écouter :
   - \`checkout.session.completed\`
   - \`checkout.session.expired\`
   - \`payment_intent.payment_failed\`
   - \`charge.refunded\`
5. Copier le **Signing secret** (whsec_...)

### 5. Configuration .env
\`\`\`bash
cp .env.example .env
nano .env
\`\`\`

**Variables Stripe obligatoires :**
\`\`\`env
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete
STRIPE_PUBLISHABLE_KEY=pk_test_votre_cle_publique
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret

STRIPE_SUCCESS_URL=http://localhost:3000/reservation-success
STRIPE_CANCEL_URL=http://localhost:3000/reservation-cancel
\`\`\`

### 6. Initialiser la base
\`\`\`bash
npm run init-db
\`\`\`

### 7. Démarrer le serveur
\`\`\`bash
npm start  # Production
npm run dev  # Développement avec nodemon
\`\`\`

Le serveur démarre sur : \`http://localhost:3001\`

## 💳 Structure Base de Données

### Table \`reservations\`
\`\`\`sql
- id SERIAL PRIMARY KEY
- nom, email, telephone
- date_reservation, heure_reservation
- nombre_personnes
- type_reservation ('standard' | 'privatisation')
- statut ('en_attente' | 'paiement_en_cours' | 'payee' | 'confirmee' | 'annulee')
\`\`\`

### Table \`paiements\`
\`\`\`sql
- id SERIAL PRIMARY KEY
- reservation_id (FK)
- stripe_session_id (unique)
- stripe_payment_intent_id
- montant_total DECIMAL
- statut_paiement ('pending' | 'succeeded' | 'failed' | 'refunded')
- metadata JSONB
- date_paiement
\`\`\`

### Table \`tarifs_privatisation\`
\`\`\`sql
- prix_base (ex: 500€)
- prix_par_personne (ex: 20€)
- personnes_min (ex: 10)
- personnes_max (ex: 50)
- duree_heures (ex: 4h)
- inclus TEXT[] (liste avantages)
\`\`\`

## 🔌 API Endpoints

### Paiement (Public)

#### \`POST /api/payment/calculate\`
Calculer le montant d'une privatisation
\`\`\`json
{
  "nombre_personnes": 25
}
\`\`\`

**Réponse :**
\`\`\`json
{
  "success": true,
  "data": {
    "montantBase": 500,
    "montantParPersonne": 20,
    "nombrePersonnes": 25,
    "montantTotal": 1000,
    "devise": "eur"
  }
}
\`\`\`

#### \`POST /api/payment/create-reservation\`
Créer une réservation privatisation avec paiement
\`\`\`json
{
  "nom": "Jean Dupont",
  "email": "jean@example.com",
  "telephone": "0612345678",
  "date_reservation": "2025-11-15",
  "heure_reservation": "20:00",
  "nombre_personnes": 25,
  "commentaires": "Anniversaire 30 ans"
}
\`\`\`

**Réponse :**
\`\`\`json
{
  "success": true,
  "data": {
    "reservation_id": 123,
    "stripe_checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "stripe_session_id": "cs_test_...",
    "montant_total": 1000,
    "expires_at": "2025-10-28T11:30:00Z"
  }
}
\`\`\`

**Flow :**
1. Le client remplit le formulaire
2. L'API crée la réservation (statut: \`paiement_en_cours\`)
3. L'API génère une session Stripe Checkout
4. Le client est redirigé vers Stripe pour payer
5. Après paiement, Stripe envoie un webhook
6. L'API met à jour le statut en \`payee\`

#### \`GET /api/payment/session/:sessionId\`
Vérifier le statut d'un paiement
\`\`\`bash
curl http://localhost:3001/api/payment/session/cs_test_abc123
\`\`\`

#### \`POST /api/webhooks/stripe\`
Webhook Stripe (appelé automatiquement par Stripe)
- ⚠️ **Ne pas appeler manuellement**
- Vérifie la signature avec \`STRIPE_WEBHOOK_SECRET\`
- Met à jour automatiquement les statuts

### Admin (JWT requis)

#### \`GET /api/admin/reservations\`
Liste toutes les réservations avec paiements
\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/admin/reservations
\`\`\`

#### \`GET /api/admin/stats\`
Statistiques avec chiffre d'affaires
\`\`\`json
{
  "success": true,
  "data": {
    "total_reservations": 50,
    "reservations_payees": 12,
    "paiements_reussis": 12,
    "chiffre_affaires": 15000.00,
    "total_privatisations": 15
  }
}
\`\`\`

#### \`POST /api/payment/refund/:reservationId\`
Créer un remboursement
\`\`\`bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "reason": "requested_by_customer"}' \
  http://localhost:3001/api/payment/refund/123
\`\`\`

## 💰 Tarification

### Configuration par défaut
- **Prix de base** : 500€
- **Prix par personne** : 20€
- **Minimum** : 10 personnes
- **Maximum** : 50 personnes

### Exemples de calcul
- 10 personnes : 500€ + (10 × 20€) = **700€**
- 25 personnes : 500€ + (25 × 20€) = **1000€**
- 50 personnes : 500€ + (50 × 20€) = **1500€**

### Modifier les tarifs
Dans PostgreSQL :
\`\`\`sql
UPDATE tarifs_privatisation 
SET prix_base = 600, prix_par_personne = 25
WHERE actif = true;
\`\`\`

Ou dans le fichier \`.env\` :
\`\`\`env
PRIVATISATION_BASE_PRICE=600
PRIVATISATION_PRICE_PER_PERSON=25
PRIVATISATION_MIN_PERSONS=10
PRIVATISATION_MAX_PERSONS=50
\`\`\`

## 🔔 Webhooks Stripe

### Événements gérés
- **\`checkout.session.completed\`** : Paiement réussi
- **\`checkout.session.expired\`** : Session expirée (30 min)
- **\`payment_intent.payment_failed\`** : Paiement échoué
- **\`charge.refunded\`** : Remboursement effectué

### Tester les webhooks en local

#### 1. Installer Stripe CLI
\`\`\`bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.17.1/stripe_1.17.1_linux_x86_64.tar.gz
tar -xvf stripe_1.17.1_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
\`\`\`

#### 2. Login Stripe CLI
\`\`\`bash
stripe login
\`\`\`

#### 3. Écouter les webhooks
\`\`\`bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
\`\`\`

Cela va générer un \`whsec_...\` à copier dans votre \`.env\`

#### 4. Tester un événement
\`\`\`bash
stripe trigger checkout.session.completed
\`\`\`

## 🔒 Sécurité

### Vérification webhook
Chaque webhook Stripe est vérifié avec :
- Signature HMAC SHA-256
- Secret webhook unique
- Protection contre replay attacks

### Autres protections
- JWT pour l'admin
- Rate limiting (100 req/15min)
- Validation stricte des données
- Transactions PostgreSQL
- CORS restreint
- Helmet security headers

## 🌐 Déploiement Production

### Variables d'environnement
\`\`\`env
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_votre_vraie_cle
STRIPE_WEBHOOK_SECRET=whsec_votre_vrai_secret
STRIPE_SUCCESS_URL=https://lanoche-paris.fr/success
STRIPE_CANCEL_URL=https://lanoche-paris.fr/cancel
POSTGRES_SSL=true
\`\`\`

### Webhook en production
1. Déployer votre API sur un serveur public (Heroku, Railway, etc.)
2. Configurer le webhook sur https://votre-domaine.com/api/webhooks/stripe
3. Utiliser les vraies clés Stripe (sk_live_...)

### Plateformes recommandées
- **Heroku** : Facile, PostgreSQL inclus
- **Railway** : Moderne, PostgreSQL + déploiement Git
- **DigitalOcean** : Contrôle total, App Platform
- **Render** : Gratuit pour débuter

## 🧪 Tests

### Test mode Stripe
Par défaut, utilisez les clés **test** (\`sk_test_...\`)
- Aucun vrai paiement
- Cartes de test disponibles

### Cartes de test Stripe
\`\`\`
4242 4242 4242 4242  → Paiement réussi
4000 0000 0000 0002  → Paiement refusé
4000 0000 0000 9995  → Paiement échoué (insufficient funds)
\`\`\`

Date : N'importe quelle date future  
CVC : N'importe quel 3 chiffres  
Code postal : N'importe lequel

## 📊 Monitoring

### Dashboard Stripe
https://dashboard.stripe.com
- Paiements en temps réel
- Remboursements
- Clients
- Rapports financiers

### Logs serveur
\`\`\`bash
# Voir les logs en temps réel
npm run dev

# Logs webhook Stripe
stripe listen --print-json
\`\`\`

## 💡 Conseils

### Frontend
Afficher le montant avant le paiement :
\`\`\`javascript
// 1. Calculer le montant
const response = await fetch('/api/payment/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nombre_personnes: 25 })
});
const { data } = await response.json();
console.log(\`Montant total: \${data.montantTotal}€\`);

// 2. Créer la réservation et rediriger vers Stripe
const resResponse = await fetch('/api/payment/create-reservation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(reservationData)
});
const { data: resData } = await resResponse.json();
window.location.href = resData.stripe_checkout_url;
\`\`\`

### Notifications email
Stripe envoie automatiquement :
- Confirmation de paiement
- Reçu par email
- Facture PDF

Pour des emails personnalisés, utiliser un service SMTP (configuré dans \`.env\`)

## 📞 Support

La Noche  
42 Rue des Martyrs, 75009 Paris  
contact@lanoche-paris.fr  
01 42 82 42 82

Documentation Stripe : https://stripe.com/docs/api

---

© 2025 La Noche - Backend avec Stripe
