import React, { useState } from 'react';
import './Reservation.css';

const Reservation = () => {
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    date: '',
    heure: '20:00',
    personnes: '',
    commentaires: ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simuler l'envoi vers l'API backend
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMessage({
        type: 'success',
        text: '🎉 Réservation confirmée ! Nous vous contacterons sous 24h pour finaliser les détails.'
      });

      setFormData({
        nom: '',
        email: '',
        telephone: '',
        date: '',
        heure: '20:00',
        personnes: '',
        commentaires: ''
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: '❌ Une erreur s\'est produite. Veuillez réessayer ou nous contacter directement.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="reservation" className="reservation-section">
      <h2 className="section-title">Réservation</h2>

      <div className="reservation-container">
        <div className="reservation-info">
          <h3>🎤 Réservez votre soirée karaoké</h3>
          <ul>
            <li>✨ Entrée : 17€ avec 1 consommation incluse</li>
            <li>🎵 Plus de 500 chansons disponibles</li>
            <li>🍸 Large carte de boissons premium</li>
            <li>🎤 Matériel professionnel haute qualité</li>
            <li>📍 Dans les caves voûtées authentiques de Pigalle</li>
          </ul>
        </div>

        <form className="reservation-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="nom">Nom complet *</label>
              <input
                type="text"
                id="nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                required
                placeholder="Jean Dupont"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="jean@example.com"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="telephone">Téléphone *</label>
              <input
                type="tel"
                id="telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                required
                placeholder="06 12 34 56 78"
              />
            </div>
            <div className="form-group">
              <label htmlFor="personnes">Nombre de personnes *</label>
              <select
                id="personnes"
                name="personnes"
                value={formData.personnes}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionnez</option>
                <option value="1">1 personne</option>
                <option value="2">2 personnes</option>
                <option value="3">3 personnes</option>
                <option value="4">4 personnes</option>
                <option value="5">5 personnes</option>
                <option value="6">6 personnes</option>
                <option value="7">7 personnes</option>
                <option value="8">8 personnes</option>
                <option value="9">9 personnes</option>
                <option value="10+">10+ personnes</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="heure">Heure *</label>
              <input
                type="time"
                id="heure"
                name="heure"
                value={formData.heure}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="commentaires">Commentaires (optionnel)</label>
            <textarea
              id="commentaires"
              name="commentaires"
              value={formData.commentaires}
              onChange={handleChange}
              rows="3"
              placeholder="Occasion spéciale, demandes particulières..."
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary btn-submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Envoi en cours...' : 'Confirmer ma réservation'}
          </button>

          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>
    </section>
  );
};

export default Reservation;