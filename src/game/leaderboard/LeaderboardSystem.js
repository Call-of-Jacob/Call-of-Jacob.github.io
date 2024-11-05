import { EventEmitter } from 'events';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AuthSystem from '../../auth/AuthSystem';
import Logger from '../../utils/Logger';

class LeaderboardSystem extends EventEmitter {
    constructor() {
        super();
        this.leaderboards = new Map();
        this.categories = {
            GLOBAL: 'global',
            WEEKLY: 'weekly',
            DAILY: 'daily',
            FRIENDS: 'friends'
        };
        this.sortFields = {
            KILLS: 'stats.kills',
            SCORE: 'stats.score',
            WINS: 'stats.wins',
            ACCURACY: 'stats.accuracy',
            KD_RATIO: 'stats.kdRatio'
        };
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.initialized = false;
    }

    async init() {
        try {
            await this.initializeLeaderboards();
            this.startPeriodicUpdate();
            this.initialized = true;
            Logger.info('Leaderboard system initialized');
        } catch (error) {
            Logger.error('Failed to initialize leaderboard system:', error);
            throw error;
        }
    }

    async initializeLeaderboards() {
        for (const category of Object.values(this.categories)) {
            this.leaderboards.set(category, {
                data: new Map(),
                lastUpdate: 0
            });
        }
    }

    startPeriodicUpdate() {
        // Update weekly and daily leaderboards periodically
        setInterval(() => {
            this.updateLeaderboard(this.categories.WEEKLY);
        }, 15 * 60 * 1000); // Every 15 minutes

        setInterval(() => {
            this.updateLeaderboard(this.categories.DAILY);
        }, 5 * 60 * 1000); // Every 5 minutes
    }

    async getLeaderboard(category, sortBy = this.sortFields.SCORE, count = 100) {
        const leaderboard = this.leaderboards.get(category);
        if (!leaderboard) {
            throw new Error(`Invalid leaderboard category: ${category}`);
        }

        const now = Date.now();
        if (now - leaderboard.lastUpdate > this.cacheTimeout) {
            await this.updateLeaderboard(category, sortBy, count);
        }

        return Array.from(leaderboard.data.values())
            .sort((a, b) => this.compareStats(b, a, sortBy))
            .slice(0, count);
    }

    async updateLeaderboard(category, sortBy = this.sortFields.SCORE, count = 100) {
        try {
            const leaderboard = this.leaderboards.get(category);
            if (!leaderboard) return;

            const timeRange = this.getTimeRange(category);
            const queryConstraints = [
                orderBy(sortBy, 'desc'),
                limit(count)
            ];

            if (timeRange) {
                queryConstraints.push(
                    where('lastPlayed', '>=', timeRange.start),
                    where('lastPlayed', '<=', timeRange.end)
                );
            }

            if (category === this.categories.FRIENDS) {
                const friendIds = await this.getFriendIds();
                if (friendIds.length === 0) return [];
                queryConstraints.push(where('userId', 'in', friendIds));
            }

            const q = query(collection(db, 'users'), ...queryConstraints);
            const querySnapshot = await getDocs(q);

            leaderboard.data.clear();
            querySnapshot.forEach(doc => {
                const data = doc.data();
                leaderboard.data.set(doc.id, {
                    id: doc.id,
                    username: data.username,
                    stats: data.stats,
                    rank: 0
                });
            });

            // Calculate ranks
            this.calculateRanks(leaderboard.data, sortBy);

            leaderboard.lastUpdate = Date.now();
            this.emit('leaderboardUpdated', { category, entries: leaderboard.data.size });

        } catch (error) {
            Logger.error(`Failed to update ${category} leaderboard:`, error);
            throw error;
        }
    }

    calculateRanks(leaderboardData, sortBy) {
        const entries = Array.from(leaderboardData.values())
            .sort((a, b) => this.compareStats(b, a, sortBy));

        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });
    }

    compareStats(a, b, sortField) {
        const getValue = (obj, path) => {
            return path.split('.').reduce((o, i) => o?.[i], obj);
        };

        const valueA = getValue(a, sortField);
        const valueB = getValue(b, sortField);

        if (typeof valueA === 'number' && typeof valueB === 'number') {
            return valueA - valueB;
        }
        return 0;
    }

    getTimeRange(category) {
        const now = new Date();
        switch (category) {
            case this.categories.DAILY:
                const dayStart = new Date(now);
                dayStart.setHours(0, 0, 0, 0);
                return {
                    start: dayStart,
                    end: now
                };
            case this.categories.WEEKLY:
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                return {
                    start: weekStart,
                    end: now
                };
            default:
                return null;
        }
    }

    async getFriendIds() {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return [];

        try {
            const userDoc = await AuthSystem.getUserProfile(userId);
            return userDoc.friends
                ?.filter(friend => friend.status === 'accepted')
                .map(friend => friend.userId) || [];
        } catch (error) {
            Logger.error('Failed to get friend IDs:', error);
            return [];
        }
    }

    async getPlayerRank(userId, category = this.categories.GLOBAL) {
        const leaderboard = await this.getLeaderboard(category);
        const entry = leaderboard.find(e => e.id === userId);
        return entry?.rank || null;
    }

    async updatePlayerStats(stats) {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return;

        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                'stats': stats,
                'lastPlayed': new Date()
            });

            // Update local cache if player is in any leaderboard
            for (const [category, leaderboard] of this.leaderboards) {
                if (leaderboard.data.has(userId)) {
                    leaderboard.data.get(userId).stats = stats;
                    this.calculateRanks(leaderboard.data, this.sortFields.SCORE);
                }
            }

            this.emit('playerStatsUpdated', { userId, stats });
        } catch (error) {
            Logger.error('Failed to update player stats:', error);
            throw error;
        }
    }

    async getPlayerStats(userId) {
        try {
            const userProfile = await AuthSystem.getUserProfile(userId);
            return userProfile.stats;
        } catch (error) {
            Logger.error('Failed to get player stats:', error);
            throw error;
        }
    }

    dispose() {
        this.leaderboards.clear();
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new LeaderboardSystem(); 