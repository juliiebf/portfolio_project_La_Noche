import React from 'react';
import './Tarifs.css';

const Tarifs = () => {
  return (
    <section id="tarifs" className="tarifs-section">
      <h2 className="section-title">Tarifs</h2>

      <div className="pricing-highlight">
        🎤 Entrée : <strong>17€</strong> avec 1 consommation incluse
      </div>

      <div className="pricing-features">
        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3>Ambiance Authentique</h3>
          <p>Caves voûtées historiques dans le cœur de Pigalle</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎵</div>
          <h3>500+ Chansons</h3>
          <p>Catalogue immense : français, anglais, tous les genres</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🍸</div>
          <h3>Carte Premium</h3>
          <p>Large sélection de boissons de qualité</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🎤</div>
          <h3>Son Professionnel</h3>
          <p>Matériel haute qualité pour une expérience optimale</p>
        </div>
      </div>

      <div className="pricing-info">
        <div className="info-section">
          <h3>🕒 Horaires</h3>
          <p>Mercredi - Samedi : 22h30 - 5h</p>
          <p>Fermé : Dimanche - Mardi</p>
        </div>

        <div className="info-section">
          <h3>📍 Localisation</h3>
          <p>42 Rue des Martyrs</p>
          <p>75009 Paris (Métro Pigalle)</p>
        </div>

        <div className="info-section">
          <h3>📞 Réservations</h3>
          <p>01 42 82 42 82</p>
          <p>contact@lanoche-paris.fr</p>
        </div>
      </div>
    </section>
  );
};

export default Tarifs;