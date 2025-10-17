import React, { useState, useEffect } from 'react';
import './Header.css';

const Header = () => {
  const [activeSection, setActiveSection] = useState('accueil');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['accueil', 'tarifs', 'reservation', 'boissons', 'chansons', 'galerie', 'evenements', 'contact'];
      const scrollPosition = window.scrollY + 100;

      sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetBottom = offsetTop + element.offsetHeight;

          if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
            setActiveSection(section);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { id: 'accueil', label: 'Accueil' },
    { id: 'tarifs', label: 'Tarifs' },
    { id: 'reservation', label: 'Réservation' },
    { id: 'boissons', label: 'Boissons' },
    { id: 'chansons', label: 'Chansons' },
    { id: 'galerie', label: 'Galerie' },
    { id: 'evenements', label: 'Événements' },
    { id: 'contact', label: 'Contact' }
  ];

  return (
    <header className="header">
      <nav className="nav">
        <div className="logo" onClick={() => scrollToSection('accueil')}>
          🎤 La Noche
        </div>
        <ul className="nav-links">
          {navItems.map(item => (
            <li key={item.id}>
              <button 
                className={`nav-link ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
};

export default Header;