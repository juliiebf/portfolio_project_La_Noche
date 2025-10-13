const mongoose = require('mongoose');
const videoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  url: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Video', videoSchema);
