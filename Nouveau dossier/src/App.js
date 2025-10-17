import React from 'react';
import './App.css';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import Tarifs from './components/Tarifs/Tarifs';
import Reservation from './components/Reservation/Reservation';
import Boissons from './components/Boissons/Boissons';
import Chansons from './components/Chansons/Chansons';
import Galerie from './components/Galerie/Galerie';
import Evenements from './components/Evenements/Evenements';
import Contact from './components/Contact/Contact';
import Footer from './components/Footer/Footer';

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <Hero />
        <Tarifs />
        <Reservation />
        <Boissons />
        <Chansons />
        <Galerie />
        <Evenements />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;