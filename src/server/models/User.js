const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    stats: {
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },
        kills: { type: Number, default: 0 },
        deaths: { type: Number, default: 0 }
    },
    loadouts: [{
        name: String,
        primary: Object,
        secondary: Object,
        perks: [String]
    }],
    unlocks: [String],
    achievements: [String],
    created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema); 