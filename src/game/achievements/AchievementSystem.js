import { EventEmitter } from 'events';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AuthSystem from '../../auth/AuthSystem';
import Logger from '../../utils/Logger';

class Achievement {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.icon = config.icon;
        this.category = config.category;
        this.points = config.points || 0;
        this.secret = config.secret || false;
        this.requirements = config.requirements;
        this.progress = 0;
        this.completed = false;
        this.completedDate = null;
        this.rewards = config.rewards || [];
    }

    updateProgress(value) {
        if (this.completed) return false;
        
        this.progress = Math.min(value, this.requirements.target);
        const wasCompleted = this.checkCompletion();
        return wasCompleted;
    }

    checkCompletion() {
        if (this.completed) return false;

        if (this.progress >= this.requirements.target) {
            this.completed = true;
            this.completedDate = new Date();
            return true;
        }
        return false;
    }

    getProgress() {
        return {
            current: this.progress,
            target: this.requirements.target,
            percentage: (this.progress / this.requirements.target) * 100
        };
    }
}

class AchievementSystem extends EventEmitter {
    constructor() {
        super();
        this.achievements = new Map();
        this.playerAchievements = new Set();
        this.trackedStats = new Map();
        this.initialized = false;
    }

    async init() {
        try {
            await this.loadAchievements();
            await this.loadPlayerAchievements();
            this.setupTracking();
            this.initialized = true;
            Logger.info('Achievement system initialized');
        } catch (error) {
            Logger.error('Failed to initialize achievement system:', error);
            throw error;
        }
    }

    async loadAchievements() {
        // Load achievement definitions
        const achievements = [
            {
                id: 'first_blood',
                name: 'First Blood',
                description: 'Get your first kill',
                icon: 'medal_first_blood',
                category: 'combat',
                points: 10,
                requirements: {
                    type: 'kills',
                    target: 1
                }
            },
            {
                id: 'marksman',
                name: 'Marksman',
                description: 'Get 100 headshots',
                icon: 'medal_headshot',
                category: 'combat',
                points: 50,
                requirements: {
                    type: 'headshots',
                    target: 100
                }
            },
            {
                id: 'survivor',
                name: 'Survivor',
                description: 'Win a match without dying',
                icon: 'medal_survivor',
                category: 'gameplay',
                points: 100,
                requirements: {
                    type: 'flawless_victory',
                    target: 1
                }
            },
            // Add more achievements as needed
        ];

        achievements.forEach(config => {
            this.achievements.set(config.id, new Achievement(config));
        });
    }

    async loadPlayerAchievements() {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return;

        try {
            const userDoc = await AuthSystem.getUserProfile(userId);
            if (userDoc.achievements) {
                userDoc.achievements.forEach(achievement => {
                    const achievementObj = this.achievements.get(achievement.id);
                    if (achievementObj) {
                        achievementObj.completed = true;
                        achievementObj.completedDate = achievement.unlockedAt;
                        this.playerAchievements.add(achievement.id);
                    }
                });
            }
        } catch (error) {
            Logger.error('Failed to load player achievements:', error);
        }
    }

    setupTracking() {
        // Track various game events
        this.trackedStats.set('kills', 0);
        this.trackedStats.set('headshots', 0);
        this.trackedStats.set('deaths', 0);
        this.trackedStats.set('wins', 0);
        this.trackedStats.set('matches_played', 0);
    }

    trackStat(statName, value) {
        if (!this.trackedStats.has(statName)) return;

        const oldValue = this.trackedStats.get(statName);
        this.trackedStats.set(statName, oldValue + value);

        // Check achievements related to this stat
        this.checkAchievements(statName);
    }

    checkAchievements(trigger) {
        for (const achievement of this.achievements.values()) {
            if (achievement.completed) continue;
            if (achievement.requirements.type !== trigger) continue;

            const statValue = this.trackedStats.get(trigger) || 0;
            const wasCompleted = achievement.updateProgress(statValue);

            if (wasCompleted) {
                this.unlockAchievement(achievement);
            }
        }
    }

    async unlockAchievement(achievement) {
        if (this.playerAchievements.has(achievement.id)) return;

        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return;

        try {
            // Update Firestore
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                achievements: arrayUnion({
                    id: achievement.id,
                    unlockedAt: new Date()
                })
            });

            this.playerAchievements.add(achievement.id);

            // Grant rewards
            await this.grantAchievementRewards(achievement);

            // Emit event
            this.emit('achievementUnlocked', {
                achievement: {
                    id: achievement.id,
                    name: achievement.name,
                    description: achievement.description,
                    points: achievement.points
                },
                rewards: achievement.rewards
            });

            Logger.info(`Achievement unlocked: ${achievement.name}`);
        } catch (error) {
            Logger.error(`Failed to unlock achievement: ${achievement.id}`, error);
        }
    }

    async grantAchievementRewards(achievement) {
        for (const reward of achievement.rewards) {
            try {
                switch (reward.type) {
                    case 'xp':
                        await this.grantXP(reward.amount);
                        break;
                    case 'item':
                        await this.grantItem(reward.itemId);
                        break;
                    case 'title':
                        await this.grantTitle(reward.titleId);
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

    async grantItem(itemId) {
        // Implement item granting logic
    }

    async grantTitle(titleId) {
        // Implement title granting logic
    }

    getAchievement(id) {
        return this.achievements.get(id);
    }

    getPlayerAchievements() {
        return Array.from(this.achievements.values())
            .filter(achievement => this.playerAchievements.has(achievement.id));
    }

    getUnlockedAchievements() {
        return Array.from(this.playerAchievements);
    }

    getProgress(achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement) return null;
        return achievement.getProgress();
    }

    getPoints() {
        return Array.from(this.playerAchievements)
            .reduce((total, id) => {
                const achievement = this.achievements.get(id);
                return total + (achievement?.points || 0);
            }, 0);
    }

    dispose() {
        this.achievements.clear();
        this.playerAchievements.clear();
        this.trackedStats.clear();
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new AchievementSystem(); 