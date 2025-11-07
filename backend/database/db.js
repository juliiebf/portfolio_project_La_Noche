const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'karaoke_db',
  password: 'mon_nouveau_mdp',
  port: 5432,
});

module.exports = pool;
