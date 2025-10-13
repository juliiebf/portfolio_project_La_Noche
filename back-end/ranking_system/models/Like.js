const mongoose = require('mongoose');
const likeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Like', likeSchema);
