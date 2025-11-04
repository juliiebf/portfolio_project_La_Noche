CREATE DATABASE karaoke_db;

\c karaoke_db

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE TABLE salles (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    capacite INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    salle_id INT REFERENCES salles(id) ON DELETE SET NULL,
    date_reservation DATE NOT NULL,
    heure_debut TIME NOT NULL,
    heure_fin TIME NOT NULL,
    nombre_personnes INT NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_heures CHECK (heure_fin > heure_debut),
    CONSTRAINT check_personnes CHECK (nombre_personnes > 0)
);

CREATE TABLE scores (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chanson VARCHAR(200) NOT NULL,
    artiste VARCHAR(200) NOT NULL,
    score INT NOT NULL CHECK (score >= 0 AND score <= 100),
    commentaire TEXT,
    date_score TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO salles (nom, capacite, description) 
VALUES ('Salle Principale', 20, 'Grande salle de karaoké avec système audio professionnel');

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_date ON reservations(date_reservation);
CREATE INDEX idx_scores_user ON scores(user_id);
CREATE INDEX idx_scores_chanson ON scores(chanson, artiste);
