# portfolio_project_La_Noche
projet portfolio, site web bar karaoke : La Noche


NodeJS + express pour créer le serveur, les routes, le parsing JSON.

procesql pour gérer la base de données.

multer pour gérer l'upload des fichiers vidéo.

test curl :

    Connexion utilisateur (POST /api/users/login):  
curl -X POST -H "Content-Type: application/json" \
-d '{"username": "EmmaKaraoke"}' \
-c cookies.txt \
http://localhost:3000/api/users/login; echo

    Obtenir les infos de l’utilisateur connecté (GET /api/users/me)
curl -b cookies.txt http://localhost:3000/api/users/me; echo

    Déconnexion (POST /api/users/logout)
curl -X POST -b cookies.txt http://localhost:3000/api/users/logout; echo

    Upload vidéo (POST /api/videos/upload) (remplacer le chemin par un fichier réel)
curl -X POST -b cookies.txt -F "video=@/chemin/vers/ta/video.mp4" \
http://localhost:3000/api/videos/upload; echo
    
    Liker une vidéo (POST /api/videos/:id/like)
curl -X POST -b cookies.txt http://localhost:3000/api/videos/1/like; echo
Remplace 1 par l’id réel de la vidéo.

    Liste toutes les vidéos (GET /api/videos)
curl http://localhost:3000/api/videos; echo

    Tester l’erreur de connexion avec un corps JSON malformé ou pseudo vide :
curl -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/users/login; echo

fonctions fichiers :

1. index.js
C’est le point d’entrée de ton application Express.
Il configure :

Le serveur (port d’écoute),

Le middleware de gestion des sessions,

Le parser JSON des requêtes,

La gestion des fichiers statiques (uploads),

Et les routes principales pour les utilisateurs (/api/users) et vidéos (/api/videos).

2. routes/users.js
Ce fichier gère tout le système utilisateur :

Middleware isLoggedIn qui vérifie que l’utilisateur est connecté (session active),

Route POST /login pour enregistrer ou connecter un utilisateur,

Route POST /logout pour déconnecter l’utilisateur (supprimer la session),

Route GET /me protégée pour obtenir les infos du user connecté.

Il utilise la base de données pour vérifier et enregistrer les utilisateurs.

3. routes/videos.js
Ce fichier gère les vidéos et interactions :

Configuration de multer pour gérer l’upload des fichiers vidéos dans un dossier local,

Middleware isLoggedIn pour protéger les routes nécessitant d’être connecté,

Route POST /upload pour uploader une vidéo et enregistrer ses infos en base,

Route POST /:id/like pour liker une vidéo (1 like par user max),

Route GET / pour lister toutes les vidéos avec leurs likes et créateurs.