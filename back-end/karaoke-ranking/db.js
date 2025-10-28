const { Pool } = require('pg');

const pool = new Pool({
  user: 'karaoke_user',
  host: 'localhost',
  database: 'karaoke_db',
  password: 'karaoke_pass',
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
