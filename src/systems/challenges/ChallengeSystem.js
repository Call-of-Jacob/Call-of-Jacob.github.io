import { EventEmitter } from 'events';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AuthSystem from '../../auth/AuthSystem';
import Logger from '../../utils/Logger';

class Challenge {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.category = config.category;
        this.type = config.type;
        this.target = config.target;
        this.progress = 0;
        this.completed = false;
        this.rewards = config.rewards || [];
        this.conditions = config.conditions || [];
        this.timeLimit = config.timeLimit;
        this.startTime = null;
        this.weapon = config.weapon;
        this.map = config.map;
        this.gameMode = config.gameMode;
    }

    start() {
        this.startTime = Date.now();
        this.progress = 0;
        this.completed = false;
    }

    update(value) {
        if (this.completed) return false;
        if (this.timeLimit && Date.now() - this.startTime > this.timeLimit) return false;

        this.progress = Math.min(value, this.target);
        return this.checkCompletion();
    }

    checkCompletion() {
        if (this.completed) return false;

        if (this.progress >= this.target && this.checkConditions()) {
            this.completed = true;
            return true;
        }
        return false;
    }

    checkConditions() {
        return this.conditions.every(condition => condition.check());
    }

    getProgress() {
        return {
            current: this.progress,
            target: this.target,
            percentage: (this.progress / this.target) * 100,
            timeRemaining: this.timeLimit ? 
                Math.max(0, this.timeLimit - (Date.now() - this.startTime)) : null
        };
    }
}

class ChallengeSystem extends EventEmitter {
    constructor() {
        super();
        this.challenges = new Map();
        this.activeChallenges = new Set();
        this.completedChallenges = new Set();
        this.initialized = false;
        this.categories = {
            DAILY: 'daily',
            WEEKLY: 'weekly',
            WEAPON: 'weapon',
            ACHIEVEMENT: 'achievement',
            SEASONAL: 'seasonal'
        };
    }

    async init() {
        try {
            await this.loadChallenges();
            await this.loadPlayerProgress();
            this.setupEventListeners();
            this.initialized = true;
            Logger.info('Challenge system initialized');
        } catch (error) {
            Logger.error('Failed to initialize challenge system:', error);
            throw error;
        }
    }

    async loadChallenges() {
        // Load challenge definitions
        const challenges = [
            {
                id: 'headshot_master',
                name: 'Headshot Master',
                description: 'Get 50 headshot kills',
                category: this.categories.WEEKLY,
                type: 'headshots',
                target: 50,
                rewards: [
                    { type: 'xp', amount: 5000 },
                    { type: 'weapon_skin', id: 'golden_m1' }
                ]
            },
            {
                id: 'quick_draw',
                name: 'Quick Draw',
                description: 'Get 10 kills within 5 seconds of weapon swap',
                category: this.categories.DAILY,
                type: 'quick_kills',
                target: 10,
                timeLimit: 24 * 60 * 60 * 1000, // 24 hours
                rewards: [
                    { type: 'xp', amount: 1000 }
                ]
            },
            {
                id: 'm1_garand_master',
                name: 'M1 Garand Master',
                description: 'Get 1000 kills with the M1 Garand',
                category: this.categories.WEAPON,
                type: 'weapon_kills',
                target: 1000,
                weapon: 'm1_garand',
                rewards: [
                    { type: 'weapon_skin', id: 'vintage_m1' },
                    { type: 'title', id: 'garand_master' }
                ]
            }
            // Add more challenges
        ];

        challenges.forEach(config => {
            this.challenges.set(config.id, new Challenge(config));
        });
    }

    async loadPlayerProgress() {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return;

        try {
            const userProfile = await AuthSystem.getUserProfile(userId);
            
            // Load completed challenges
            userProfile.completedChallenges?.forEach(challenge => {
                this.completedChallenges.add(challenge.id);
            });

            // Load active challenges progress
            userProfile.activeChallenges?.forEach(challenge => {
                const challengeObj = this.challenges.get(challenge.id);
                if (challengeObj) {
                    challengeObj.progress = challenge.progress;
                    this.activeChallenges.add(challenge.id);
                }
            });
        } catch (error) {
            Logger.error('Failed to load player challenge progress:', error);
        }
    }

    setupEventListeners() {
        // Listen for various game events
        this.on('kill', (data) => this.handleKill(data));
        this.on('headshot', (data) => this.handleHeadshot(data));
        this.on('weaponSwap', (data) => this.handleWeaponSwap(data));
        this.on('matchComplete', (data) => this.handleMatchComplete(data));
    }

    handleKill(data) {
        this.updateChallengesOfType('kills', 1, {
            weapon: data.weapon,
            gameMode: data.gameMode,
            map: data.map
        });
    }

    handleHeadshot(data) {
        this.updateChallengesOfType('headshots', 1, {
            weapon: data.weapon
        });
    }

    handleWeaponSwap(data) {
        // Track time since weapon swap for quick draw challenges
        this.lastWeaponSwap = Date.now();
    }

    handleMatchComplete(data) {
        this.updateChallengesOfType('matches', 1, {
            gameMode: data.gameMode,
            result: data.result
        });
    }

    updateChallengesOfType(type, value, conditions = {}) {
        for (const challengeId of this.activeChallenges) {
            const challenge = this.challenges.get(challengeId);
            if (!challenge || challenge.type !== type) continue;

            // Check conditions
            if (conditions.weapon && challenge.weapon && challenge.weapon !== conditions.weapon) continue;
            if (conditions.gameMode && challenge.gameMode && challenge.gameMode !== conditions.gameMode) continue;
            if (conditions.map && challenge.map && challenge.map !== conditions.map) continue;

            const wasCompleted = challenge.update(challenge.progress + value);
            if (wasCompleted) {
                this.completeChallenge(challenge);
            }
        }
    }

    async completeChallenge(challenge) {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return;

        try {
            // Update Firestore
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                completedChallenges: arrayUnion({
                    id: challenge.id,
                    completedAt: new Date()
                })
            });

            this.activeChallenges.delete(challenge.id);
            this.completedChallenges.add(challenge.id);

            // Grant rewards
            await this.grantRewards(challenge.rewards);

            this.emit('challengeCompleted', {
                challenge: {
                    id: challenge.id,
                    name: challenge.name,
                    description: challenge.description
                },
                rewards: challenge.rewards
            });

        } catch (error) {
            Logger.error(`Failed to complete challenge: ${challenge.id}`, error);
        }
    }

    async grantRewards(rewards) {
        for (const reward of rewards) {
            try {
                switch (reward.type) {
                    case 'xp':
                        await this.grantXP(reward.amount);
                        break;
                    case 'weapon_skin':
                        await this.grantWeaponSkin(reward.id);
                        break;
                    case 'title':
                        await this.grantTitle(reward.id);
                        break;
                    default:
                        Logger.warn(`Unknown reward type: ${reward.type}`);
                }
            } catch (error) {
                Logger.error(`Failed to grant reward: ${reward.type}`, error);
            }
        }
    }

    async grantXP(amount) {
        // Implement XP granting logic
    }

    async grantWeaponSkin(skinId) {
        // Implement weapon skin unlocking logic
    }

    async grantTitle(titleId) {
        // Implement title unlocking logic
    }

    getChallenge(id) {
        return this.challenges.get(id);
    }

    getActiveChallenges() {
        return Array.from(this.activeChallenges)
            .map(id => this.challenges.get(id))
            .filter(Boolean);
    }

    getCompletedChallenges() {
        return Array.from(this.completedChallenges)
            .map(id => this.challenges.get(id))
            .filter(Boolean);
    }

    getChallengeProgress(challengeId) {
        const challenge = this.challenges.get(challengeId);
        if (!challenge) return null;
        return challenge.getProgress();
    }

    dispose() {
        this.challenges.clear();
        this.activeChallenges.clear();
        this.completedChallenges.clear();
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new ChallengeSystem(); 