const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de sécurité
app.use(helmet());

// Configuration CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8080'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limite à 100 requêtes par IP par fenêtre de 15min
});
app.use(limiter);

// Body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connexion à la base de données
const dbPath = path.join(__dirname, 'database', 'lanoche.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur connexion DB:', err.message);
        process.exit(1);
    }
    console.log('✅ Connexion à SQLite réussie');
});

// Middleware de validation des réservations
const validateReservation = [
    body('nom').trim().isLength({ min: 2, max: 100 }).escape(),
    body('email').isEmail().normalizeEmail(),
    body('telephone').isMobilePhone('fr-FR').withMessage('Numéro français requis'),
    body('date_reservation').isDate().withMessage('Date valide requise'),
    body('heure_reservation').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure valide requise'),
    body('nombre_personnes').isInt({ min: 1, max: 20 }).withMessage('Entre 1 et 20 personnes'),
    body('commentaires').optional().trim().isLength({ max: 500 }).escape()
];

// ============ ROUTES API ============

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ 
        message: '🎤 API La Noche fonctionnelle !',
        timestamp: new Date().toISOString(),
        status: 'OK'
    });
});

// GET - Récupérer toutes les réservations (pour admin)
app.get('/api/reservations', (req, res) => {
    const query = `
        SELECT * FROM reservations 
        ORDER BY date_reservation DESC, heure_reservation DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('❌ Erreur récupération réservations:', err.message);
            res.status(500).json({ 
                error: 'Erreur serveur',
                message: 'Impossible de récupérer les réservations' 
            });
            return;
        }

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    });
});

// GET - Récupérer une réservation par ID
app.get('/api/reservations/:id', (req, res) => {
    const id = req.params.id;
    const query = `SELECT * FROM reservations WHERE id = ?`;

    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('❌ Erreur récupération réservation:', err.message);
            res.status(500).json({ 
                error: 'Erreur serveur' 
            });
            return;
        }

        if (!row) {
            res.status(404).json({ 
                error: 'Réservation non trouvée' 
            });
            return;
        }

        res.json({
            success: true,
            data: row
        });
    });
});

// POST - Créer une nouvelle réservation
app.post('/api/reservations', validateReservation, (req, res) => {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Données invalides',
            details: errors.array()
        });
    }

    const {
        nom,
        email,
        telephone,
        date_reservation,
        heure_reservation,
        nombre_personnes,
        commentaires
    } = req.body;

    // Vérifier que la date n'est pas dans le passé
    const reservationDate = new Date(date_reservation + 'T' + heure_reservation);
    const now = new Date();

    if (reservationDate < now) {
        return res.status(400).json({
            success: false,
            error: 'La date de réservation ne peut pas être dans le passé'
        });
    }

    // Vérifier les créneaux disponibles (éviter les doublons)
    const checkQuery = `
        SELECT COUNT(*) as count 
        FROM reservations 
        WHERE date_reservation = ? 
        AND heure_reservation = ? 
        AND statut != 'annulee'
    `;

    db.get(checkQuery, [date_reservation, heure_reservation], (err, result) => {
        if (err) {
            console.error('❌ Erreur vérification créneau:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la vérification du créneau'
            });
        }

        // Limiter le nombre de réservations simultanées
        if (result.count >= 3) {
            return res.status(409).json({
                success: false,
                error: 'Créneau complet. Veuillez choisir une autre heure.'
            });
        }

        // Insérer la nouvelle réservation
        const insertQuery = `
            INSERT INTO reservations (
                nom, email, telephone, date_reservation, 
                heure_reservation, nombre_personnes, commentaires
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertQuery, [
            nom, email, telephone, date_reservation,
            heure_reservation, nombre_personnes, commentaires || null
        ], function(err) {
            if (err) {
                console.error('❌ Erreur insertion réservation:', err.message);
                return res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la création de la réservation'
                });
            }

            console.log(`✅ Nouvelle réservation créée - ID: ${this.lastID}`);

            res.status(201).json({
                success: true,
                message: '🎉 Réservation confirmée !',
                data: {
                    id: this.lastID,
                    nom,
                    email,
                    date_reservation,
                    heure_reservation,
                    nombre_personnes
                }
            });
        });
    });
});

// PUT - Modifier une réservation
app.put('/api/reservations/:id', validateReservation, (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Données invalides',
            details: errors.array()
        });
    }

    const id = req.params.id;
    const {
        nom, email, telephone, date_reservation,
        heure_reservation, nombre_personnes, commentaires, statut
    } = req.body;

    const updateQuery = `
        UPDATE reservations SET 
            nom = ?, email = ?, telephone = ?, date_reservation = ?,
            heure_reservation = ?, nombre_personnes = ?, commentaires = ?,
            statut = ?, date_modification = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(updateQuery, [
        nom, email, telephone, date_reservation,
        heure_reservation, nombre_personnes, commentaires,
        statut || 'en_attente', id
    ], function(err) {
        if (err) {
            console.error('❌ Erreur modification réservation:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la modification'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Réservation non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Réservation modifiée avec succès',
            changes: this.changes
        });
    });
});

// DELETE - Supprimer une réservation
app.delete('/api/reservations/:id', (req, res) => {
    const id = req.params.id;

    db.run('DELETE FROM reservations WHERE id = ?', [id], function(err) {
        if (err) {
            console.error('❌ Erreur suppression:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la suppression'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Réservation non trouvée'
            });
        }

        res.json({
            success: true,
            message: 'Réservation supprimée',
            changes: this.changes
        });
    });
});

// GET - Statistiques des réservations
app.get('/api/stats', (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as count FROM reservations',
        enAttente: "SELECT COUNT(*) as count FROM reservations WHERE statut = 'en_attente'",
        confirmees: "SELECT COUNT(*) as count FROM reservations WHERE statut = 'confirmee'",
        aujourdhui: "SELECT COUNT(*) as count FROM reservations WHERE date_reservation = date('now')"
    };

    const stats = {};
    let completed = 0;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], [], (err, result) => {
            if (!err) {
                stats[key] = result.count;
            }
            completed++;

            if (completed === Object.keys(queries).length) {
                res.json({
                    success: true,
                    data: stats
                });
            }
        });
    });
});

// Servir les fichiers statiques (frontend)
app.use(express.static(path.join(__dirname, '../la-noche-multipage-FIXED')));

// Route catch-all pour SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../la-noche-multipage-FIXED', 'index.html'));
});

// Gestion d'erreur globale
app.use((err, req, res, next) => {
    console.error('❌ Erreur serveur:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur'
    });
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`\n🎤 Serveur La Noche démarré !`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🗄️ Base de données: ${dbPath}`);
    console.log(`🚀 API disponible sur: http://localhost:${PORT}/api/`);
    console.log(`\n✨ Prêt à recevoir les réservations !`);
});

// Fermeture propre
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    db.close((err) => {
        if (err) {
            console.error('❌ Erreur fermeture DB:', err.message);
        } else {
            console.log('✅ Base de données fermée');
        }
        process.exit(0);
    });
});