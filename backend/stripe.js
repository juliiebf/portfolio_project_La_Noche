require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/**
 * Créer une session Stripe Checkout pour une privatisation
 */
async function createCheckoutSession(reservationData) {
  const { 
    reservationId, 
    email, 
    nom, 
    nombrePersonnes, 
    dateReservation, 
    heureReservation,
    montantTotal 
  } = reservationData;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: process.env.STRIPE_CURRENCY || 'eur',
          product_data: {
            name: 'Privatisation La Noche',
            description: `Privatisation pour ${nombrePersonnes} personnes - ${dateReservation} à ${heureReservation}`,
            images: ['https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400'],
          },
          unit_amount: Math.round(montantTotal * 100), // Stripe utilise les centimes
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservationId}`,
      cancel_url: `${process.env.STRIPE_CANCEL_URL}?reservation_id=${reservationId}`,
      metadata: {
        reservation_id: reservationId.toString(),
        nom: nom,
        email: email,
        nombre_personnes: nombrePersonnes.toString(),
        date_reservation: dateReservation,
        heure_reservation: heureReservation,
      },
      payment_intent_data: {
        metadata: {
          reservation_id: reservationId.toString(),
        }
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expire dans 30 minutes
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
      expiresAt: new Date(session.expires_at * 1000)
    };

  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    throw error;
  }
}

/**
 * Récupérer une session Stripe
 */
async function getCheckoutSession(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    console.error('Erreur récupération session:', error);
    throw error;
  }
}

/**
 * Créer un remboursement
 */
async function createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Si null, remboursement total
      reason: reason
    });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status
    };
  } catch (error) {
    console.error('Erreur création remboursement:', error);
    throw error;
  }
}

/**
 * Vérifier la signature du webhook Stripe
 */
function verifyWebhookSignature(payload, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    return event;
  } catch (error) {
    console.error('Erreur vérification webhook:', error);
    throw error;
  }
}

/**
 * Calculer le montant total d'une privatisation
 */
function calculatePrivatisationAmount(nombrePersonnes, tarifConfig = null) {
  const config = tarifConfig || {
    prix_base: process.env.PRIVATISATION_BASE_PRICE || 500,
    prix_par_personne: process.env.PRIVATISATION_PRICE_PER_PERSON || 20,
    personnes_min: process.env.PRIVATISATION_MIN_PERSONS || 10,
    personnes_max: process.env.PRIVATISATION_MAX_PERSONS || 50
  };

  if (nombrePersonnes < parseInt(config.personnes_min)) {
    throw new Error(`Minimum ${config.personnes_min} personnes requis pour une privatisation`);
  }
  if (nombrePersonnes > parseInt(config.personnes_max)) {
    throw new Error(`Maximum ${config.personnes_max} personnes pour une privatisation`);
  }

  // **Important** : conversion en nombre ici
  const prixBase = parseFloat(config.prix_base);
  const prixParPersonne = parseFloat(config.prix_par_personne);

  const montantTotal = prixBase + (nombrePersonnes * prixParPersonne);

  return {
    montantBase: prixBase,
    montantParPersonne: prixParPersonne,
    nombrePersonnes,
    montantTotal,
    devise: process.env.STRIPE_CURRENCY || 'eur'
  };
}


module.exports = {
  createCheckoutSession,
  getCheckoutSession,
  createRefund,
  verifyWebhookSignature,
  calculatePrivatisationAmount,
  stripe
};
