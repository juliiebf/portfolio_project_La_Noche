# 🧪 Guide de Test Stripe - La Noche

## 🎯 Objectif
Tester le flow complet de paiement privatisation sans débourser d'argent réel.

## 📝 Prérequis
- Serveur démarré : \`npm run dev\`
- Clés Stripe TEST configurées dans .env
- PostgreSQL initialisé : \`npm run init-db\`

## ✅ Test 1 : Calcul du tarif

### Requête
\`\`\`bash
curl -X POST http://localhost:3001/api/payment/calculate \
  -H "Content-Type: application/json" \
  -d '{"nombre_personnes": 25}'
\`\`\`

### Résultat attendu
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

## ✅ Test 2 : Créer une réservation avec paiement

### Requête
\`\`\`bash
curl -X POST http://localhost:3001/api/payment/create-reservation \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Jean Test",
    "email": "jean.test@example.com",
    "telephone": "0612345678",
    "date_reservation": "2025-12-31",
    "heure_reservation": "20:00",
    "nombre_personnes": 25,
    "commentaires": "Test privatisation"
  }'
\`\`\`

### Résultat attendu
\`\`\`json
{
  "success": true,
  "data": {
    "reservation_id": 1,
    "stripe_checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "stripe_session_id": "cs_test_...",
    "montant_total": 1000
  }
}
\`\`\`

### Actions manuelles
1. Copier l'\`stripe_checkout_url\`
2. Ouvrir dans un navigateur
3. Utiliser une carte de test :
   - Numéro : \`4242 4242 4242 4242\`
   - Date : N'importe quelle date future
   - CVC : \`123\`
   - Code postal : \`75009\`
4. Valider le paiement
5. Vous êtes redirigé vers SUCCESS_URL

## ✅ Test 3 : Vérifier la session de paiement

### Requête
\`\`\`bash
curl http://localhost:3001/api/payment/session/cs_test_VOTRE_SESSION_ID
\`\`\`

### Résultat attendu
\`\`\`json
{
  "success": true,
  "data": {
    "session_id": "cs_test_...",
    "payment_status": "paid",
    "reservation_id": 1,
    "montant_total": 1000
  }
}
\`\`\`

## ✅ Test 4 : Webhook Stripe (automatique)

### Configuration Stripe CLI
\`\`\`bash
# 1. Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Login
stripe login

# 3. Écouter les webhooks
stripe listen --forward-to localhost:3001/api/webhooks/stripe
\`\`\`

### Déclencher un webhook de test
\`\`\`bash
stripe trigger checkout.session.completed
\`\`\`

### Vérifier dans PostgreSQL
\`\`\`sql
-- La réservation doit être passée en statut 'payee'
SELECT * FROM reservations WHERE id = 1;

-- Le paiement doit être en statut 'succeeded'
SELECT * FROM paiements WHERE reservation_id = 1;
\`\`\`

## ✅ Test 5 : Statistiques admin

### Login admin
\`\`\`bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "AdminLaNoche2025!"
  }'
\`\`\`

Copier le \`token\` de la réponse.

### Récupérer les stats
\`\`\`bash
curl http://localhost:3001/api/admin/stats \
  -H "Authorization: Bearer VOTRE_TOKEN"
\`\`\`

### Résultat attendu
\`\`\`json
{
  "success": true,
  "data": {
    "total_reservations": 1,
    "reservations_payees": 1,
    "paiements_reussis": 1,
    "chiffre_affaires": 1000.00,
    "total_privatisations": 1
  }
}
\`\`\`

## ✅ Test 6 : Remboursement

### Requête
\`\`\`bash
curl -X POST http://localhost:3001/api/payment/refund/1 \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "requested_by_customer"}'
\`\`\`

### Résultat attendu
\`\`\`json
{
  "success": true,
  "message": "Remboursement effectué",
  "data": {
    "refundId": "re_...",
    "amount": 1000,
    "status": "succeeded"
  }
}
\`\`\`

### Vérifier
1. Dans Stripe Dashboard : remboursement visible
2. Dans PostgreSQL : statut \`refunded\`

## 🧪 Cartes de test Stripe

### Succès
- \`4242 4242 4242 4242\` → Paiement réussi

### Échec
- \`4000 0000 0000 0002\` → Carte refusée
- \`4000 0000 0000 9995\` → Fonds insuffisants
- \`4000 0000 0000 9987\` → Code postal incorrect

### 3D Secure (authentification)
- \`4000 0025 0000 3155\` → 3D Secure requis

## 📊 Vérifications dans Dashboard Stripe

1. Aller sur https://dashboard.stripe.com/test/payments
2. Voir tous les paiements de test
3. Cliquer sur un paiement pour voir les détails
4. Vérifier les métadonnées (\`reservation_id\`, etc.)

## ✅ Checklist complète

- [ ] Calcul tarif fonctionne
- [ ] Réservation créée en DB
- [ ] URL Stripe Checkout générée
- [ ] Paiement test réussi
- [ ] Webhook reçu et traité
- [ ] Statut réservation mis à jour (\`payee\`)
- [ ] Stats admin affichent le CA
- [ ] Remboursement fonctionne

## 🎉 Résultat final

Si tous les tests passent, votre système de paiement Stripe est **opérationnel** !

Vous pouvez passer en **mode production** en :
1. Utilisant les clés LIVE Stripe
2. Configurant le webhook sur votre domaine public
3. Testant avec une vraie carte (petits montants)

---

© 2025 La Noche - Guide de test Stripe
