import React from 'react';
import './Boissons.css';

const Boissons = () => {
  const drinks = [
    { category: "🥃 Spiritueux", name: "Vodka", price: "15€", description: "Avec soft au choix" },
    { category: "🥃 Spiritueux", name: "Rhum", price: "15€", description: "Avec soft au choix" },
    { category: "🥃 Spiritueux", name: "Whisky", price: "15€", description: "Avec soft au choix" },
    { category: "🥃 Spiritueux", name: "Gin", price: "15€", description: "Avec soft au choix" },
    { category: "🍺 Bières", name: "Heineken", price: "10€", description: "Pression 50cl" },
    { category: "🍺 Bières", name: "1664", price: "10€", description: "Pression 50cl" },
    { category: "🍾 Bouteilles", name: "Champagne", price: "200€", description: "Sélection premium" },
    { category: "🍾 Bouteilles", name: "Spiritueux Premium", price: "150-180€", description: "Bouteilles haut de gamme" }
  ];

  return (
    <section id="boissons" className="boissons-section">
      <h2 className="section-title">Notre Carte des Boissons</h2>

      <div className="drinks-intro">
        <p>🍸 Découvrez notre sélection de boissons premium pour accompagner vos performances !</p>
      </div>

      <div className="drinks-grid">
        {drinks.map((drink, index) => (
          <div key={index} className="drink-card">
            <div className="drink-category">{drink.category}</div>
            <div className="drink-name">{drink.name}</div>
            <div className="drink-price">{drink.price}</div>
            <div className="drink-description">{drink.description}</div>
          </div>
        ))}
      </div>

      <div className="drinks-note">
        <p>
          💡 <strong>Consommation incluse avec l'entrée !</strong><br/>
          Votre ticket d'entrée à 17€ comprend déjà une boisson de votre choix.
        </p>
      </div>
    </section>
  );
};

export default Boissons;