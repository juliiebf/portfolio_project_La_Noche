CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- ============================================
-- TABLE: SALLES
-- ============================================
CREATE TABLE salles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    capacite INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLE: RESERVATIONS
-- ============================================
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salle_id INT NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
    date_reservation DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    nombre_personnes INT NOT NULL CHECK (nombre_personnes > 0),
    status VARCHAR(50) DEFAULT 'confirmee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Contraintes
    CONSTRAINT check_heures CHECK (heure_fin > heure_debut)
);

-- ============================================
-- TABLE: SCORES
-- ============================================
CREATE TABLE scores (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chanson VARCHAR(200) NOT NULL,
    artiste VARCHAR(200) NOT NULL,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    commentaire TEXT,
    date_score TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEX POUR PERFORMANCES
-- ============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_salle ON reservations(salle_id);
CREATE INDEX idx_reservations_date ON reservations(date_reservation);
CREATE INDEX idx_scores_user ON scores(user_id);

-- ============================================
-- DONNÉES DE TEST
-- ============================================

-- Insérer des salles
INSERT INTO salles (nom, capacite, description) VALUES
('Salle Principale', 20, 'Grande salle avec système audio professionnel'),
('Salle VIP', 10, 'Salle intime avec service premium'),
('Salle Familiale', 15, 'Salle spacieuse pour familles et groupes');

-- Afficher les résultats
SELECT 'Base de données créée avec succès !' as message;
SELECT '✅ Tables créées: users, salles, reservations, scores' as info;
SELECT 'Salles disponibles:' as info;
SELECT * FROM salles;