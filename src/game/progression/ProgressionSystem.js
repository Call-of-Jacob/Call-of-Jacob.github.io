import { EventEmitter } from 'events';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AuthSystem from '../../auth/AuthSystem';
import Logger from '../../utils/Logger';

class ProgressionSystem extends EventEmitter {
    constructor() {
        super();
        this.currentLevel = 1;
        this.currentXP = 0;
        this.prestige = 0;
        this.unlocks = new Map();
        this.challenges = new Map();
        this.initialized = false;
        this.xpMultiplier = 1;
        this.seasonPass = {
            level: 1,
            xp: 0,
            rewards: new Map()
        };
    }

    async init() {
        try {
            await this.loadPlayerProgress();
            this.setupXPEvents();
            this.initialized = true;
            Logger.info('Progression system initialized');
        } catch (error) {
            Logger.error('Failed to initialize progression system:', error);
            throw error;
        }
    }

    async loadPlayerProgress() {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) throw new Error('User not authenticated');

        const userProfile = await AuthSystem.getUserProfile(userId);
        
        this.currentLevel = userProfile.stats.level || 1;
        this.currentXP = userProfile.stats.xp || 0;
        this.prestige = userProfile.stats.prestige || 0;
        
        // Load unlocks
        userProfile.unlocks?.forEach(unlock => {
            this.unlocks.set(unlock.id, unlock);
        });

        // Load challenges
        userProfile.challenges?.forEach(challenge => {
            this.challenges.set(challenge.id, challenge);
        });

        // Load season pass progress
        if (userProfile.seasonPass) {
            this.seasonPass = userProfile.seasonPass;
        }
    }

    setupXPEvents() {
        // Listen for various game events that award XP
        this.on('kill', (data) => this.awardXP('kill', data));
        this.on('assist', (data) => this.awardXP('assist', data));
        this.on('objective', (data) => this.awardXP('objective', data));
        this.on('matchComplete', (data) => this.awardXP('matchComplete', data));
    }

    awardXP(type, data = {}) {
        const xpValues = {
            kill: 100,
            headshot: 150,
            assist: 50,
            objective: 200,
            matchComplete: 500,
            matchWin: 1000
        };

        let xpAmount = xpValues[type] || 0;

        // Apply modifiers
        xpAmount *= this.xpMultiplier;
        if (data.doubleXP) xpAmount *= 2;

        this.addXP(xpAmount);
    }

    async addXP(amount) {
        this.currentXP += amount;

        // Check for level up
        while (this.currentXP >= this.getNextLevelXP()) {
            await this.levelUp();
        }

        // Update season pass XP
        this.addSeasonPassXP(amount * 0.5); // 50% of normal XP goes to season pass

        // Save progress
        await this.saveProgress();

        this.emit('xpGained', {
            amount,
            total: this.currentXP,
            level: this.currentLevel
        });
    }

    async levelUp() {
        const overflow = this.currentXP - this.getNextLevelXP();
        this.currentLevel++;
        this.currentXP = overflow;

        // Check for prestige
        if (this.currentLevel >= 55) {
            await this.checkPrestige();
        }

        // Process level-based unlocks
        const unlocks = this.processLevelUnlocks();

        this.emit('levelUp', {
            level: this.currentLevel,
            unlocks
        });
    }

    async checkPrestige() {
        if (this.currentLevel === 55 && await this.canPrestige()) {
            this.prestige++;
            this.currentLevel = 1;
            this.currentXP = 0;
            this.xpMultiplier += 0.1; // 10% XP boost per prestige

            this.emit('prestige', {
                level: this.prestige,
                xpMultiplier: this.xpMultiplier
            });
        }
    }

    async canPrestige() {
        // Add any additional prestige requirements here
        return true;
    }

    processLevelUnlocks() {
        const unlocks = [];
        const levelUnlocks = this.getLevelUnlocks(this.currentLevel);

        levelUnlocks.forEach(unlock => {
            this.unlocks.set(unlock.id, {
                ...unlock,
                unlockedAt: new Date()
            });
            unlocks.push(unlock);
        });

        return unlocks;
    }

    getLevelUnlocks(level) {
        // Define unlocks for each level
        const unlockMap = {
            1: [{ id: 'weapon_m1garand', type: 'weapon', name: 'M1 Garand' }],
            2: [{ id: 'perk_marathon', type: 'perk', name: 'Marathon' }],
            3: [{ id: 'weapon_thompson', type: 'weapon', name: 'Thompson' }],
            // Add more level unlocks
        };

        return unlockMap[level] || [];
    }

    addSeasonPassXP(amount) {
        this.seasonPass.xp += amount;

        while (this.seasonPass.xp >= this.getNextSeasonPassLevelXP()) {
            this.seasonPassLevelUp();
        }
    }

    seasonPassLevelUp() {
        const overflow = this.seasonPass.xp - this.getNextSeasonPassLevelXP();
        this.seasonPass.level++;
        this.seasonPass.xp = overflow;

        const rewards = this.getSeasonPassRewards(this.seasonPass.level);
        this.emit('seasonPassLevelUp', {
            level: this.seasonPass.level,
            rewards
        });
    }

    getSeasonPassRewards(level) {
        // Define season pass rewards
        const rewardMap = {
            1: [{ type: 'skin', id: 'weapon_skin_1', name: 'Vintage Camo' }],
            2: [{ type: 'xp_token', id: 'double_xp_1h', duration: 3600 }],
            // Add more rewards
        };

        return rewardMap[level] || [];
    }

    getNextLevelXP() {
        // XP required increases with each level
        return Math.floor(1000 * Math.pow(1.5, this.currentLevel - 1));
    }

    getNextSeasonPassLevelXP() {
        return 10000; // Fixed XP per season pass level
    }

    getLevelProgress() {
        const nextLevelXP = this.getNextLevelXP();
        return {
            level: this.currentLevel,
            currentXP: this.currentXP,
            nextLevelXP,
            percentage: (this.currentXP / nextLevelXP) * 100
        };
    }

    getSeasonPassProgress() {
        const nextLevelXP = this.getNextSeasonPassLevelXP();
        return {
            level: this.seasonPass.level,
            currentXP: this.seasonPass.xp,
            nextLevelXP,
            percentage: (this.seasonPass.xp / nextLevelXP) * 100
        };
    }

    async saveProgress() {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return;

        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                'stats.level': this.currentLevel,
                'stats.xp': this.currentXP,
                'stats.prestige': this.prestige,
                unlocks: Array.from(this.unlocks.values()),
                challenges: Array.from(this.challenges.values()),
                seasonPass: this.seasonPass
            });
        } catch (error) {
            Logger.error('Failed to save progression:', error);
            throw error;
        }
    }

    isUnlocked(itemId) {
        return this.unlocks.has(itemId);
    }

    getUnlocks() {
        return Array.from(this.unlocks.values());
    }

    dispose() {
        this.removeAllListeners();
        this.unlocks.clear();
        this.challenges.clear();
        this.initialized = false;
    }
}

export default new ProgressionSystem(); 