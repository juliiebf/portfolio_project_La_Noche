-- Créer l'utilisateur et la base (à exécuter seulement si l'utilisateur/base n'existent pas)
CREATE USER karaoke_user WITH PASSWORD 'karaoke_pass';
CREATE DATABASE karaoke_db OWNER karaoke_user;

-- Se connecter à la base fraichement créée
\c karaoke_db

-- Création des tables
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR NOT NULL UNIQUE
);

CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR NOT NULL,
  likes INTEGER DEFAULT 0
);

CREATE TABLE likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  UNIQUE(user_id, video_id)
);
