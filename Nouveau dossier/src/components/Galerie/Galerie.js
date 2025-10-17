import React from 'react';
import './Galerie.css';

const Galerie = () => {
  const images = [
    { url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600", title: "Notre Scène", description: "Équipée du meilleur son" },
    { url: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600", title: "Le Bar", description: "Large sélection de boissons" },
    { url: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600", title: "L'Ambiance", description: "Lumières et son de qualité" },
    { url: "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600", title: "Salle Principale", description: "Espace convivial" },
    { url: "https://images.unsplash.com/photo-1598387181032-a3103a2db5b3?w=600", title: "Équipement Pro", description: "Son et lumière premium" },
    { url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600", title: "Soirées Animées", description: "Ambiance garantie" }
  ];

  const handleSharePhotos = () => {
    alert('📸 Envoyez vos photos à contact@lanoche-paris.fr\nNous les publierons avec plaisir !');
  };

  return (
    <section id="galerie" className="galerie-section">
      <h2 className="section-title">Notre Espace</h2>

      <div className="gallery-intro">
        <p>🏛️ Découvrez l'atmosphère unique de nos caves voûtées historiques</p>
      </div>

      <div className="gallery-grid">
        {images.map((image, index) => (
          <div key={index} className="gallery-item">
            <img src={image.url} alt={image.title} loading="lazy" />
            <div className="gallery-overlay">
              <h3>{image.title}</h3>
              <p>{image.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="upload-section">
        <h3>📸 Partagez vos souvenirs</h3>
        <p>Vous avez des photos de vos soirées à La Noche ?</p>
        <button className="btn-secondary" onClick={handleSharePhotos}>
          Envoyez-nous vos photos
        </button>
      </div>
    </section>
  );
};

export default Galerie;