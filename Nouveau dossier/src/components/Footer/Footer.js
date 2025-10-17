import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-logo">
          <h3>🎤 La Noche</h3>
          <p>Le karaoké authentique de Pigalle depuis 2015</p>
        </div>

        <div className="footer-links">
          <a href="#accueil">Accueil</a>
          <a href="#tarifs">Tarifs</a> 
          <a href="#reservation">Réservation</a>
          <a href="#contact">Contact</a>
        </div>

        <div className="footer-social">
          <a href="#" aria-label="Facebook">📘</a>
          <a href="#" aria-label="Instagram">📷</a>
          <a href="#" aria-label="Twitter">🐦</a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2025 La Noche. Tous droits réservés.</p>
        <p>42 Rue des Martyrs, 75009 Paris | 01 42 82 42 82</p>
      </div>
    </footer>
  );
};

export default Footer;