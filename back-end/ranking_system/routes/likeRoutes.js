const express = require('express');
const router = express.Router();
const { likeVideo } = require('../controllers/likeController');

router.post('/like_video', likeVideo);

module.exports = router;
