require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

console.log('💳 Initialisation de la base de données avec support Stripe...');

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

    // 1. Table des réservations avec support paiement
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        telephone VARCHAR(20) NOT NULL,
        date_reservation DATE NOT NULL,
        heure_reservation TIME NOT NULL,
        nombre_personnes INTEGER NOT NULL CHECK (nombre_personnes >= 1),
        commentaires TEXT,
        type_reservation VARCHAR(20) DEFAULT 'standard' CHECK (type_reservation IN ('standard', 'privatisation')),
        statut VARCHAR(20) DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirmee', 'annulee', 'paiement_en_cours', 'payee')),
        ip_address VARCHAR(45),
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table reservations créée/vérifiée');

    // 2. Table des paiements Stripe
    await client.query(`
      CREATE TABLE IF NOT EXISTS paiements (
        id SERIAL PRIMARY KEY,
        reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE,
        stripe_session_id VARCHAR(255) UNIQUE,
        stripe_payment_intent_id VARCHAR(255),
        montant_total DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'eur',
        statut_paiement VARCHAR(30) DEFAULT 'pending' CHECK (statut_paiement IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')),
        mode_paiement VARCHAR(50),
        email_client VARCHAR(100),
        metadata JSONB,
        stripe_webhook_received BOOLEAN DEFAULT false,
        date_paiement TIMESTAMP,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table paiements créée/vérifiée');

    // 3. Table tarifs privatisation
    await client.query(`
      CREATE TABLE IF NOT EXISTS tarifs_privatisation (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        description TEXT,
        prix_base DECIMAL(10, 2) NOT NULL,
        prix_par_personne DECIMAL(10, 2),
        personnes_min INTEGER DEFAULT 10,
        personnes_max INTEGER DEFAULT 50,
        duree_heures INTEGER DEFAULT 4,
        inclus TEXT[],
        actif BOOLEAN DEFAULT true,
        date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table tarifs_privatisation créée/vérifiée');

    // 4. Table des utilisateurs admin
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

    // 5. Table d'audit
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

    // 6. Index pour les performances
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date_reservation, heure_reservation);
      CREATE INDEX IF NOT EXISTS idx_reservations_email ON reservations(email);
      CREATE INDEX IF NOT EXISTS idx_reservations_statut ON reservations(statut);
      CREATE INDEX IF NOT EXISTS idx_paiements_reservation ON paiements(reservation_id);
      CREATE INDEX IF NOT EXISTS idx_paiements_stripe_session ON paiements(stripe_session_id);
      CREATE INDEX IF NOT EXISTS idx_paiements_statut ON paiements(statut_paiement);
      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
    `);
    console.log('✅ Index créés');

    // 7. Triggers pour mise à jour automatique
    await client.query(`
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.date_modification = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_reservations_modtime ON reservations;
      CREATE TRIGGER update_reservations_modtime
      BEFORE UPDATE ON reservations
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();

      DROP TRIGGER IF EXISTS update_paiements_modtime ON paiements;
      CREATE TRIGGER update_paiements_modtime
      BEFORE UPDATE ON paiements
      FOR EACH ROW
      EXECUTE FUNCTION update_modified_column();
    `);
    console.log('✅ Triggers créés');

    // 8. Insérer tarifs de privatisation par défaut
    const existingTarif = await client.query('SELECT id FROM tarifs_privatisation LIMIT 1');

    if (existingTarif.rows.length === 0) {
      await client.query(`
        INSERT INTO tarifs_privatisation 
          (nom, description, prix_base, prix_par_personne, personnes_min, personnes_max, duree_heures, inclus)
        VALUES 
          ('Privatisation Standard', 
           'Privatisation complète du bar pour votre événement', 
           500.00, 
           20.00, 
           10, 
           50, 
           4,
           ARRAY['Son et lumière professionnels', 'Accès au catalogue complet', 'Service bar privé', 'Équipe dédiée'])
      `);
      console.log('✅ Tarif de privatisation par défaut créé');
    }

    // 9. Créer utilisateur admin
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = 'AdminLaNoche2025!';

    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [adminUsername]
    );

    if (existingAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      await client.query(
        `INSERT INTO users (username, password_hash, email, role) 
         VALUES ($1, $2, $3, $4)`,
        [adminUsername, hashedPassword, 'admin@lanoche-paris.fr', 'admin']
      );

      console.log('✅ Utilisateur admin créé');
      console.log('🔐 Username: admin');
      console.log('🔑 Password: AdminLaNoche2025!');
      console.log('⚠️  CHANGEZ CE MOT DE PASSE EN PRODUCTION !');
    }

    // 10. Statistiques
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM reservations) as total_reservations,
        (SELECT COUNT(*) FROM paiements) as total_paiements,
        (SELECT COUNT(*) FROM users) as total_users
    `);

    console.log('\n📊 Statistiques de la base :');
    console.log(`   Réservations: ${stats.rows[0].total_reservations}`);
    console.log(`   Paiements: ${stats.rows[0].total_paiements}`);
    console.log(`   Utilisateurs: ${stats.rows[0].total_users}`);

    console.log('\n💳 Base de données avec support Stripe initialisée !');
    console.log(`📍 Database: ${process.env.POSTGRES_DATABASE || 'lanoche'}`);

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
    console.log('\n✨ Initialisation terminée avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Échec initialisation:', error.message);
    process.exit(1);
  });
