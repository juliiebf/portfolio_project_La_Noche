import React, { useState, useEffect } from 'react';
import './Hero.css';

const Hero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1600',
      alt: 'La Noche - Scène principale'
    },
    {
      image: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1600',
      alt: 'La Noche - Bar'
    },
    {
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600',
      alt: 'La Noche - Ambiance'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const scrollToReservation = () => {
    const element = document.getElementById('reservation');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="accueil" className="hero">
      <div className="hero-carousel">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${slide.image})` }}
          />
        ))}
        <div className="hero-overlay" />
      </div>

      <div className="hero-content">
        <h1 className="hero-title">LA NOCHE</h1>
        <p className="hero-subtitle">
          Le karaoké authentique dans les caves voûtées de Pigalle
        </p>
        <button className="btn-primary hero-btn" onClick={scrollToReservation}>
          Réserver maintenant
        </button>
      </div>

      <div className="hero-indicators">
        {slides.map((_, index) => (
          <button 
            key={index}
            className={`indicator ${index === currentSlide ? 'active' : ''}`}
            onClick={() => setCurrentSlide(index)}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;