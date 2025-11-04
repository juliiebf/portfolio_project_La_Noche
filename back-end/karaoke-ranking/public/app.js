const apiUrl = '';

document.getElementById('loginBtn').onclick = () => {
  const username = prompt('Entre ton pseudo');
  fetch('/api/users/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ username }),
    credentials: 'include'
  }).then(res => res.json())
    .then(data => {
      alert(data.message || 'Connecté');
      updateUserInfo();
    });
};

document.getElementById('logoutBtn').onclick = () => {
  fetch('/api/users/logout', {method: 'POST', credentials: 'include'}).then(res => res.json())
    .then(() => {
      alert('Déconnecté');
      updateUserInfo();
    });
};

function updateUserInfo() {
  fetch('/api/users/me', {credentials: 'include'})
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        document.getElementById('userInfo').textContent = 'Connecté : ' + data.user.username;
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'inline-block';
      } else {
        document.getElementById('userInfo').textContent = 'Non connecté';
        document.getElementById('loginBtn').style.display = 'inline-block';
        document.getElementById('logoutBtn').style.display = 'none';
      }
    });
}

document.getElementById('uploadForm').onsubmit = (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('videoFile');
  const formData = new FormData();
  formData.append('video', fileInput.files[0]);

  fetch('/api/videos/upload', {
    method: 'POST',
    body: formData,
    credentials: 'include'
  }).then(res => res.json())
    .then(data => {
      alert(data.message || 'Vidéo uploadée');
      loadVideos();
    });
};

function loadVideos() {
  fetch('/api/videos')
    .then(res => res.json())
    .then(videos => {
      const container = document.getElementById('videoList');
      container.innerHTML = '';
      videos.forEach(v => {
        const videoDiv = document.createElement('div');
        let videoContent = '';
        if (v.filename) {
          videoContent = `<video src="/uploads/${v.filename}" controls></video>`;
        }
        videoDiv.innerHTML = `
          <p>Utilisateur: ${v.username}</p>
          <p>Fichier: ${v.filename}</p>
          <p>Likes: ${v.likes}</p>
          <button onclick="likeVideo(${v.id})">Like</button>
          ${videoContent}
        `;
        container.appendChild(videoDiv);
      });
    });
}

window.likeVideo = function(videoId) {
  fetch(`/api/videos/${videoId}/like`, {
    method: 'POST',
    credentials: 'include'
  }).then(res => res.json())
    .then(data => {
      alert(data.message || data.error);
      loadVideos();
    });
}

updateUserInfo();
loadVideos();
