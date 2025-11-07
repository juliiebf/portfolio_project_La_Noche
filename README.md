# portfolio_project_La_Noche
projet portfolio, site web bar karaoke : La Noche

NodeJS + express + bcrypt + multer + express + jsonwebtoken

postegresql pour gérer la base de données.


test curl :

1. Inscription utilisateur (POST /api/auth/register)
    curl -X POST http://localhost:3000/api/auth/register \
-H "Content-Type: application/json" \
-d '{"email":"emma@example.com","password":"motdepasse123","nom":"Furlan","prenom":"Emma"}'

2. Connexion utilisateur (POST /api/auth/login)
    curl -X POST http://localhost:3000/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email":"emma@example.com","password":"motdepasse123"}'

3. Récupérer les vidéos (GET /api/videos)
    curl http://localhost:3000/api/videos

4. Uploader une vidéo (POST /api/videos/upload) - nécessite token JWT
Supposons que tu as stocké ton token JWT dans la variable $TOKEN et que ta vidéo s’appelle karaoke.mp4 :

curl -X POST http://localhost:3000/api/videos/upload \
-H "Authorization: Bearer $TOKEN" \
-F "video=@/chemin/vers/karaoke.mp4"
    ------- A VÉRIFIER ------

5. Liker une vidéo (POST /api/videos/:id/like) - nécessite token JWT
    curl -X POST http://localhost:3000/api/videos/1/like \
-H "Authorization: Bearer $TOKEN"
    ------- A VÉRIFIER ------

6. Créer une réservation (POST /api/reservations) - nécessite token JWT
    curl -X POST http://localhost:3000/api/reservations \
-H "Authorization: Bearer $TOKEN" \
-H "Content-Type: application/json" \
-d '{"date_reservation":"2025-11-10","heure_debut":"20:00","heure_fin":"22:00","nombre_personnes":5,"salle_id":1}'
     ------- A VÉRIFIER ------

7. Lister ses réservations (GET /api/reservations/mes-reservations) - nécessite token JWT
    curl http://localhost:3000/api/reservations/mes-reservations \
-H "Authorization: Bearer $TOKEN"
     ------- A VÉRIFIER ------
