const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    stats: {
        level: { type: Number, default: 1 },
        xp: { type: Number, default: 0 },
        kills: { type: Number, default: 0 },
        deaths: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        playtime: { type: Number, default: 0 }
    },
    loadouts: [{
        name: String,
        primary: {
            weapon: String,
            attachments: [String]
        },
        secondary: {
            weapon: String,
            attachments: [String]
        },
        perks: [String],
        equipment: {
            lethal: String,
            tactical: String
        }
    }],
    unlocks: {
        weapons: [String],
        attachments: [String],
        perks: [String],
        equipment: [String]
    },
    achievements: [{
        id: String,
        unlockedAt: Date
    }],
    friends: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted'],
            default: 'pending'
        }
    }],
    settings: {
        sensitivity: { type: Number, default: 1 },
        volume: {
            master: { type: Number, default: 1 },
            sfx: { type: Number, default: 1 },
            music: { type: Number, default: 0.7 }
        },
        keybinds: {
            type: Map,
            of: String,
            default: {
                forward: 'KeyW',
                backward: 'KeyS',
                left: 'KeyA',
                right: 'KeyD',
                jump: 'Space',
                crouch: 'KeyC',
                sprint: 'ShiftLeft',
                reload: 'KeyR',
                interact: 'KeyE',
                weaponPrimary: 'Digit1',
                weaponSecondary: 'Digit2',
                melee: 'KeyV'
            }
        }
    },
    lastLogin: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to update stats
UserSchema.methods.updateStats = function(gameStats) {
    this.stats.kills += gameStats.kills || 0;
    this.stats.deaths += gameStats.deaths || 0;
    this.stats.xp += gameStats.xp || 0;
    
    // Level up logic
    while (this.stats.xp >= this.getNextLevelXP()) {
        this.stats.level++;
    }
    
    if (gameStats.won) {
        this.stats.wins++;
    } else {
        this.stats.losses++;
    }
    
    this.stats.accuracy = (
        (this.stats.accuracy * (this.stats.wins + this.stats.losses) + gameStats.accuracy) / 
        (this.stats.wins + this.stats.losses + 1)
    );
    
    this.stats.playtime += gameStats.playtime || 0;
};

// Helper method to calculate XP needed for next level
UserSchema.methods.getNextLevelXP = function() {
    return Math.floor(1000 * Math.pow(1.5, this.stats.level - 1));
};

const User = mongoose.model('User', UserSchema);

module.exports = User; 