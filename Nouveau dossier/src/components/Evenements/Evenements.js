import React from 'react';
import './Evenements.css';

const Evenements = () => {
  const events = [
    {
      date: "Samedi 15 Octobre 2025",
      title: "Soirée Années 80",
      description: "Ressortez vos plus belles tenues fluo pour une soirée spéciale années 80 ! DJ + Karaoké thématique.",
      icon: "🎉"
    },
    {
      date: "Vendredi 21 Octobre 2025", 
      title: "Open Mic Night",
      description: "Soirée micro ouvert : venez chanter vos créations originales devant un public bienveillant.",
      icon: "🎤"
    },
    {
      date: "Samedi 29 Octobre 2025",
      title: "Halloween Rock Party", 
      description: "Spécial Halloween : déguisements obligatoires, répertoire rock/metal, et shots effrayants !",
      icon: "🎸"
    },
    {
      date: "Samedi 12 Novembre 2025",
      title: "Battle Karaoké",
      description: "Compétition amicale entre équipes. Prix pour les gagnants et lots de consolation.",
      icon: "🏆"
    }
  ];

  return (
    <section id="evenements" className="evenements-section">
      <h2 className="section-title">Événements à Venir</h2>

      <div className="events-intro">
        <p>🗓️ Rejoignez-nous pour nos soirées spéciales et événements thématiques !</p>
      </div>

      <div className="events-grid">
        {events.map((event, index) => (
          <div key={index} className="event-card">
            <div className="event-image">{event.icon}</div>
            <div className="event-content">
              <div className="event-date">{event.date}</div>
              <h3 className="event-title">{event.title}</h3>
              <p className="event-description">{event.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="events-cta">
        <p>💡 <strong>Suivez-nous sur les réseaux sociaux</strong> pour être informés de tous nos événements !</p>
      </div>
    </section>
  );
};

export default Evenements;