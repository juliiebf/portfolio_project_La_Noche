const Video = require("../models/Video");
const User = require("../models/User");

// Exemple simple : sélectionne la vidéo avec le plus de likes
exports.getWinner = async () => {
  const videos = await Video.find().populate("user likes");
  let winner = null;
  let max = 0;
  for (const video of videos) {
    if (video.likes.length > max) {
      max = video.likes.length;
      winner = video;
    }
  }
  return winner;
};

exports.rewardWinner = async () => {
  const winnerVideo = await exports.getWinner();
  if (winnerVideo) {
    const winnerUser = await User.findById(winnerVideo.user._id);
    winnerUser.cocktailsWon += 1;
    await winnerUser.save();
    return winnerUser;
  }
  return null;
};
