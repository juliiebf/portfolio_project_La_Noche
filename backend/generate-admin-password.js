#!/usr/bin/env node
/**
 * Script pour générer un hash bcrypt pour le mot de passe admin
 * Usage: node generate-admin-password.js "VotreMotDePasse"
 */

const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('❌ Usage: node generate-admin-password.js "VotreMotDePasse"');
  process.exit(1);
}

const saltRounds = 12;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
  
  console.log('\n✅ Hash bcrypt généré avec succès!\n');
  console.log('Ajoutez cette ligne dans votre fichier .env:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
  console.log('Ou pour un mot de passe en clair (NON RECOMMANDÉ en production):\n');
  console.log(`ADMIN_PASSWORD=${password}\n`);
});
