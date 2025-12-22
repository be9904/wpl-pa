const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: { type: String, required: true }, // stores the user id
    content: { type: String, required: true },
    likes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    likedBy: { type: [String], default: [] } //  keeps track of who liked this post
});

module.exports = mongoose.model('Post', postSchema);