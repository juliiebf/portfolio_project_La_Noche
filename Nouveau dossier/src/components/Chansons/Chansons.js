import React, { useState, useEffect } from 'react';
import './Chansons.css';

const Chansons = () => {
  const [songs] = useState([
    { title: "Bohemian Rhapsody", artist: "Queen", genre: "rock", language: "Anglais" },
    { title: "Je veux", artist: "Zaz", genre: "pop", language: "Français" },
    { title: "Lose Yourself", artist: "Eminem", genre: "rap", language: "Anglais" },
    { title: "La vie en rose", artist: "Edith Piaf", genre: "chanson", language: "Français" },
    { title: "Sweet Child O' Mine", artist: "Guns N' Roses", genre: "rock", language: "Anglais" },
    { title: "Dernière danse", artist: "Indila", genre: "pop", language: "Français" },
    { title: "Shape of You", artist: "Ed Sheeran", genre: "pop", language: "Anglais" },
    { title: "Non, je ne regrette rien", artist: "Edith Piaf", genre: "chanson", language: "Français" },
    { title: "Billie Jean", artist: "Michael Jackson", genre: "pop", language: "Anglais" },
    { title: "Hotel California", artist: "Eagles", genre: "rock", language: "Anglais" },
    { title: "Comme d'habitude", artist: "Claude François", genre: "chanson", language: "Français" },
    { title: "Thunderstruck", artist: "AC/DC", genre: "rock", language: "Anglais" },
    { title: "Papaoutai", artist: "Stromae", genre: "pop", language: "Français" },
    { title: "Don't Stop Believin'", artist: "Journey", genre: "rock", language: "Anglais" },
    { title: "Formidable", artist: "Stromae", genre: "pop", language: "Français" },
  ]);

  const [filteredSongs, setFilteredSongs] = useState(songs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  useEffect(() => {
    const filtered = songs.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          song.artist.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGenre = selectedGenre === '' || song.genre === selectedGenre;
      return matchesSearch && matchesGenre;
    });
    setFilteredSongs(filtered);
  }, [songs, searchTerm, selectedGenre]);

  const genres = [...new Set(songs.map(song => song.genre))];

  return (
    <section id="chansons" className="chansons-section">
      <h2 className="section-title">Catalogue de Chansons</h2>

      <div className="search-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Rechercher une chanson, artiste..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="genre-filter"
          >
            <option value="">Tous les genres</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>
                {genre.charAt(0).toUpperCase() + genre.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="results-info">
          {filteredSongs.length} chanson{filteredSongs.length > 1 ? 's' : ''} trouvée{filteredSongs.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="songs-grid">
        {filteredSongs.length > 0 ? (
          filteredSongs.map((song, index) => (
            <div key={index} className="song-card">
              <div className="song-title">{song.title}</div>
              <div className="song-artist">{song.artist}</div>
              <div className="song-info">
                <span className="song-genre">🎵 {song.genre}</span>
                <span className="song-language">🌍 {song.language}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>Aucune chanson trouvée pour votre recherche.</p>
            <p>Essayez avec d'autres mots-clés ou contactez-nous pour ajouter vos favorites !</p>
          </div>
        )}
      </div>

      <div className="catalogue-info">
        <p>
          💡 <strong>Notre catalogue complet contient plus de 500 chansons !</strong><br/>
          Cette liste n'est qu'un aperçu. Venez découvrir l'intégralité de notre sélection sur place.
        </p>
      </div>
    </section>
  );
};

export default Chansons;