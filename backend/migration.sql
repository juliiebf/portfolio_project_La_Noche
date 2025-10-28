-- Migration SQLite vers PostgreSQL pour La Noche

-- 1. Créer la base et l'utilisateur (à exécuter en tant que postgres)
CREATE DATABASE lanoche;
CREATE USER lanocheuser WITH ENCRYPTED PASSWORD 'yourStrongPassword123!';
GRANT ALL PRIVILEGES ON DATABASE lanoche TO lanocheuser;

-- 2. Se connecter à la base lanoche
\c lanoche

-- 3. Donner les permissions sur le schéma public
GRANT ALL ON SCHEMA public TO lanocheuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lanocheuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lanocheuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lanocheuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lanocheuser;

-- 4. Créer la table des réservations
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(100) NOT NULL CHECK (LENGTH(nom) >= 2),
  email VARCHAR(100) NOT NULL CHECK (email LIKE '%@%.%'),
  telephone VARCHAR(20) NOT NULL CHECK (LENGTH(telephone) >= 10),
  date_reservation DATE NOT NULL CHECK (date_reservation >= CURRENT_DATE),
  heure_reservation TIME NOT NULL,
  nombre_personnes INTEGER NOT NULL CHECK (nombre_personnes >= 1 AND nombre_personnes <= 20),
  commentaires TEXT CHECK (LENGTH(commentaires) <= 500),
  statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirmee', 'annulee')),
  ip_address VARCHAR(45),
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Créer les index
CREATE INDEX idx_reservations_date ON reservations(date_reservation, heure_reservation);
CREATE INDEX idx_reservations_email ON reservations(email);
CREATE INDEX idx_reservations_statut ON reservations(statut);
CREATE INDEX idx_reservations_creation ON reservations(date_creation);

-- 6. Créer le trigger de mise à jour automatique
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.date_modification = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reservations_modtime
BEFORE UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- 7. Table des utilisateurs admin
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email VARCHAR(100),
  role VARCHAR(20) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Table d'audit
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(50) NOT NULL,
  operation VARCHAR(20) NOT NULL,
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  user_id VARCHAR(50),
  ip_address VARCHAR(45),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_table ON audit_log(table_name);

-- 9. Table des tentatives de login
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  username VARCHAR(50),
  success BOOLEAN DEFAULT false,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, timestamp);

-- 10. Table pour les sessions (utilisée par connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_session_expire ON session(expire);

-- 11. Exemple d'import de données depuis SQLite (optionnel)
-- Si vous avez des données à migrer depuis SQLite, exportez-les en CSV
-- puis utilisez COPY :

-- COPY reservations(nom, email, telephone, date_reservation, heure_reservation, nombre_personnes, commentaires, statut)
-- FROM '/path/to/reservations.csv'
-- WITH (FORMAT csv, HEADER true);

-- 12. Vérifier la création
SELECT 
  table_name, 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
ORDER BY table_name, ordinal_position;

-- 13. Statistiques
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
