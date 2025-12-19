const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // 'id' as username
    password: { type: String, required: true },         // will be hashed
    roles: { type: [String], default: ['user'] }        // list of roles
});

module.exports = mongoose.model('User', userSchema);