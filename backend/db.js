require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

console.log('🔄 Initialisation de la base La Noche...');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || process.env.DB_PORT || 5432,
  user: process.env.POSTGRES_USER || process.env.DB_USER,
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.POSTGRES_DATABASE || process.env.DB_NAME || 'karaoke_db'
});

async function initDatabase() {
  const client = await pool.connect();

  try {
    console.log('✅ Connexion PostgreSQL établie');

    // Création de la table users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    console.log('✅ Table users créée');

    // Création de la table salles
    await client.query(`
      CREATE TABLE IF NOT EXISTS salles (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        capacite INT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table salles créée');

    // Création de la table reservations
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        salle_id INT NOT NULL REFERENCES salles(id) ON DELETE CASCADE,
        date_reservation DATE NOT NULL,
        heure_debut TIME NOT NULL,
        heure_fin TIME NOT NULL,
        nombre_personnes INT NOT NULL CHECK (nombre_personnes > 0),
        status VARCHAR(50) DEFAULT 'confirmee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_heures CHECK (heure_fin > heure_debut)
      )
    `);
    console.log('✅ Table reservations créée');

    // Création de la table videos
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        likes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table videos créée');

    // Création de la table likes
    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_id INT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        UNIQUE(user_id, video_id)
      )
    `);
    console.log('✅ Table likes créée');

    // Création des index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_salle ON reservations(salle_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date_reservation);
      CREATE INDEX IF NOT EXISTS idx_videos_user ON videos(user_id);
      CREATE INDEX IF NOT EXISTS idx_likes_user_video ON likes(user_id, video_id);
    `);
    console.log('✅ Index créés');

    // Insérer salles initiales si elles n'existent pas encore
    const resSalles = await client.query(`SELECT COUNT(*) FROM salles`);
    if (parseInt(resSalles.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO salles (nom, capacite, description) VALUES
          ('Salle Principale', 20, 'Grande salle avec système audio professionnel'),
          ('Salle VIP', 10, 'Salle intime avec service premium'),
          ('Salle Familiale', 15, 'Salle spacieuse pour familles et groupes')
      `);
      console.log('✅ Salles initiales insérées');
    }

    // Créer admin par défaut si non existant
    const adminEmail = 'admin@lanoche.fr';
    const adminPassword = 'AdminLaNoche2025!';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const existingAdmin = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

    if (existingAdmin.rows.length === 0) {
      await client.query(
        `INSERT INTO users (email, password_hash, nom, prenom)
         VALUES ($1, $2, 'Admin', 'La Noche')`,
        [adminEmail, hashedPassword]
      );
      console.log('✅ Admin créé:');
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
