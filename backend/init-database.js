require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

console.log('🐘 Initialisation de la base de données PostgreSQL...');

// Configuration de la connexion
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'lanocheuser',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE || 'lanoche',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('✅ Connexion PostgreSQL établie');

    // 1. Créer la table des réservations
    await client.query(`
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
      )
    `);
    console.log('✅ Table reservations créée/vérifiée');

    // 2. Créer la table des utilisateurs admin
    await client.query(`
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
      )
    `);
    console.log('✅ Table users créée/vérifiée');

    // 3. Créer la table d'audit
    await client.query(`
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
      )
    `);
    console.log('✅ Table audit_log créée/vérifiée');

    // 4. Créer la table des tentatives de login
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        ip_address VARCHAR(45) NOT NULL,
        username VARCHAR(50),
        success BOOLEAN DEFAULT false,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table login_attempts créée/vérifiée');

    // 5. Créer les index pour les performances
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_date 
      ON reservations(date_reservation, heure_reservation)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_email 
      ON reservations(email)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp 
      ON audit_log(timestamp)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_attempts_ip 
      ON login_attempts(ip_address, timestamp)
    `);
    console.log('✅ Index créés pour les performances');

    // 6. Créer les triggers pour la date de modification
    await client.query(`
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.date_modification = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_reservations_modtime ON reservations
    `);

    await client.query(`
      CREATE TRIGGER update_reservations_modtime
      BEFORE UPDATE ON reservations
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column()
    `);
    console.log('✅ Triggers de mise à jour créés');

    // 7. Créer un utilisateur admin par défaut
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = 'AdminLaNoche2025!';

    // Vérifier si l'admin existe déjà
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [adminUsername]
    );

    if (existingAdmin.rows.length === 0) {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

      await client.query(
        `INSERT INTO users (username, password_hash, email, role) 
         VALUES ($1, $2, $3, $4)`,
        [adminUsername, hashedPassword, 'admin@lanoche-paris.fr', 'admin']
      );

      console.log('✅ Utilisateur admin créé');
      console.log('🔐 Username: admin');
      console.log('🔑 Password: AdminLaNoche2025!');
      console.log('⚠️  CHANGEZ CE MOT DE PASSE EN PRODUCTION !');
    } else {
      console.log('ℹ️  Utilisateur admin existe déjà');
    }

    // 8. Statistiques de la base
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM reservations) as total_reservations,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM audit_log) as total_audit_logs
    `);

    console.log('\n📊 Statistiques de la base :');
    console.log(`   Réservations: ${stats.rows[0].total_reservations}`);
    console.log(`   Utilisateurs: ${stats.rows[0].total_users}`);
    console.log(`   Logs d'audit: ${stats.rows[0].total_audit_logs}`);

    console.log('\n🎉 Base de données PostgreSQL initialisée avec succès !');
    console.log(`📍 Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
    console.log(`📍 Database: ${process.env.POSTGRES_DATABASE || 'lanoche'}`);
    console.log(`📍 User: ${process.env.POSTGRES_USER || 'lanocheuser'}`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    console.log('✅ Connexion fermée');
  }
}

// Exécuter l'initialisation
initDatabase()
  .then(() => {
    console.log('\n✨ Script d\'initialisation terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec de l\'initialisation:', error.message);
    process.exit(1);
  });
