const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Créer ou ouvrir la base de données
const dbPath = path.join(__dirname, 'database', 'lanoche.db');
const fs = require('fs');

// Créer le dossier database s'il n'existe pas
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur lors de l\'ouverture de la base de données:', err.message);
        return;
    }
    console.log('✅ Connexion à la base de données SQLite réussie');
});

// Créer la table des réservations
const createReservationsTable = `
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT NOT NULL,
    telephone TEXT NOT NULL,
    date_reservation DATE NOT NULL,
    heure_reservation TIME NOT NULL,
    nombre_personnes INTEGER NOT NULL,
    commentaires TEXT,
    statut TEXT DEFAULT 'en_attente',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

// Créer la table des utilisateurs admin (optionnel)
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

// Créer la table des paramètres du restaurant
const createSettingsTable = `
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cle TEXT UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    description TEXT,
    date_modification DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

// Exécuter les créations de tables
db.serialize(() => {
    // Table réservations
    db.run(createReservationsTable, (err) => {
        if (err) {
            console.error('❌ Erreur création table reservations:', err.message);
        } else {
            console.log('✅ Table reservations créée/vérifiée');
        }
    });

    // Table utilisateurs
    db.run(createUsersTable, (err) => {
        if (err) {
            console.error('❌ Erreur création table users:', err.message);
        } else {
            console.log('✅ Table users créée/vérifiée');
        }
    });

    // Table paramètres
    db.run(createSettingsTable, (err) => {
        if (err) {
            console.error('❌ Erreur création table settings:', err.message);
        } else {
            console.log('✅ Table settings créée/vérifiée');
        }
    });

    // Insérer quelques paramètres par défaut
    const insertDefaultSettings = `
    INSERT OR IGNORE INTO settings (cle, valeur, description) VALUES 
    ('horaires_ouverture', 'Mercredi-Samedi 22h30-5h', 'Horaires d\'ouverture du restaurant'),
    ('prix_entree', '17', 'Prix d\'entrée en euros'),
    ('capacite_max', '50', 'Capacité maximale de personnes'),
    ('email_contact', 'contact@lanoche-paris.fr', 'Email de contact'),
    ('telephone_contact', '01 42 82 42 82', 'Téléphone de contact');`;

    db.run(insertDefaultSettings, (err) => {
        if (err) {
            console.error('❌ Erreur insertion paramètres:', err.message);
        } else {
            console.log('✅ Paramètres par défaut insérés');
        }
    });

    console.log('\n🎉 Base de données initialisée avec succès !');
    console.log('📍 Emplacement: ' + dbPath);
});

// Fermer la connexion
db.close((err) => {
    if (err) {
        console.error('❌ Erreur fermeture base:', err.message);
    } else {
        console.log('✅ Connexion à la base de données fermée');
    }
});