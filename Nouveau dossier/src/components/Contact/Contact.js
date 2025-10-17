import React from 'react';
import './Contact.css';

const Contact = () => {
  return (
    <section id="contact" className="contact-section">
      <h2 className="section-title">Contact & Informations</h2>

      <div className="contact-content">
        <div className="contact-info">
          <div className="info-item">
            <h3>📍 Adresse</h3>
            <p>42 Rue des Martyrs<br/>75009 Paris, France</p>
            <p><em>Métro : Pigalle (lignes 2, 12)</em></p>
          </div>

          <div className="info-item">
            <h3>📞 Téléphone</h3>
            <p><a href="tel:0142824282">01 42 82 42 82</a></p>
          </div>

          <div className="info-item">
            <h3>✉️ Email</h3>
            <p><a href="mailto:contact@lanoche-paris.fr">contact@lanoche-paris.fr</a></p>
          </div>

          <div className="info-item">
            <h3>🕒 Horaires</h3>
            <p><strong>Ouvert :</strong><br/>Mercredi - Samedi : 22h30 - 5h</p>
            <p><strong>Fermé :</strong><br/>Dimanche - Mardi</p>
          </div>
        </div>

        <div className="social-section">
          <h3>Suivez-nous</h3>
          <div className="social-links">
            <a href="#" aria-label="Facebook" className="social-link">
              📘 <span>Facebook</span>
            </a>
            <a href="#" aria-label="Instagram" className="social-link">
              📷 <span>Instagram</span>
            </a>
            <a href="#" aria-label="Twitter" className="social-link">
              🐦 <span>Twitter</span>
            </a>
          </div>

          <div className="contact-note">
            <p>💡 <strong>Réservations recommandées</strong><br/>
            Particulièrement en fin de semaine !</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;