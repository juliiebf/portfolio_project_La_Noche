require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

console.log('🔄 Initialisation de la base La Noche...');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
  user: process.env.POSTGRES_USER || process.env.DB_USER,
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'lanoche'
});

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('✅ Connexion PostgreSQL établie');

    // 1. Table des utilisateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        telephone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'client' CHECK (role IN ('client', 'admin', 'staff')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    console.log('✅ Table users créée');

    // 2. Table des réservations
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        telephone VARCHAR(20) NOT NULL,
        date_reservation DATE NOT NULL,
        heure_reservation TIME NOT NULL,
        nombre_personnes INTEGER NOT NULL CHECK (nombre_personnes >= 10),
        commentaires TEXT,
        type_reservation VARCHAR(20) DEFAULT 'privatisation',
        statut VARCHAR(30) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'paiement_en_cours', 'payee', 'confirmee', 'annulee')),
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table reservations créée');

    // 3. Table des paiements
    await client.query(`
      CREATE TABLE IF NOT EXISTS paiements (
        id SERIAL PRIMARY KEY,
        reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE,
        stripe_session_id VARCHAR(255) UNIQUE,
        montant_total DECIMAL(10, 2) NOT NULL,
        email_client VARCHAR(100),
        statut_paiement VARCHAR(30) DEFAULT 'pending',
        date_paiement TIMESTAMP,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table paiements créée');

    // 4. Index pour performances
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date_reservation);
      CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
      CREATE INDEX IF NOT EXISTS idx_paiements_reservation ON paiements(reservation_id);
      CREATE INDEX IF NOT EXISTS idx_paiements_session ON paiements(stripe_session_id);
    `);
    console.log('✅ Index créés');

    // 5. Créer admin par défaut
    const adminEmail = 'admin@lanoche.fr';
    const adminPassword = 'AdminLaNoche2025!';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO users (email, password_hash, nom, prenom, role)
         VALUES ($1, $2, 'Admin', 'La Noche', 'admin')`,
        [adminEmail, hashedPassword]
      );
      console.log('✅ Admin créé');
      console.log('   Email: ' + adminEmail);
      console.log('   Password: ' + adminPassword);
    }

    console.log('\n✅ Initialisation terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur initialisation:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase()
  .then(() => {
    console.log('\n✨ Base de données prête !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec:', error.message);
    process.exit(1);
  });
