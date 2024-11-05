import { EventEmitter } from 'events';
import { doc, collection, query, where, getDocs, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import AuthSystem from '../auth/AuthSystem';
import Logger from '../utils/Logger';

class MatchmakingSystem extends EventEmitter {
    constructor() {
        super();
        this.searching = false;
        this.currentMatch = null;
        this.searchStartTime = null;
        this.searchTimeout = 60000; // 60 seconds
        this.skillRange = 200;
        this.expandRangeInterval = 10000; // 10 seconds
        this.maxSkillRange = 1000;
        this.regions = ['na', 'eu', 'asia'];
        this.preferredRegion = null;
        this.initialized = false;
    }

    async init() {
        try {
            await this.determinePreferredRegion();
            this.initialized = true;
            Logger.info('Matchmaking system initialized');
        } catch (error) {
            Logger.error('Failed to initialize matchmaking system:', error);
            throw error;
        }
    }

    async determinePreferredRegion() {
        // Ping each region to determine best connection
        const pingResults = await Promise.all(
            this.regions.map(async region => {
                const start = performance.now();
                try {
                    await fetch(`https://${region}-call-of-jacob.firebaseapp.com/ping`);
                    return {
                        region,
                        latency: performance.now() - start
                    };
                } catch (error) {
                    return {
                        region,
                        latency: Infinity
                    };
                }
            })
        );

        // Select region with lowest latency
        const bestRegion = pingResults.reduce((best, current) => 
            current.latency < best.latency ? current : best
        );

        this.preferredRegion = bestRegion.region;
        Logger.info(`Selected preferred region: ${this.preferredRegion}`);
    }

    async startMatchmaking(options = {}) {
        if (this.searching) return;
        if (!AuthSystem.isAuthenticated()) throw new Error('User not authenticated');

        try {
            this.searching = true;
            this.searchStartTime = Date.now();
            this.emit('searchStarted', options);

            const user = AuthSystem.getCurrentUser();
            const userProfile = await AuthSystem.getUserProfile(user.uid);

            const searchConfig = {
                gameMode: options.gameMode || 'tdm',
                region: options.region || this.preferredRegion,
                skill: userProfile.stats.skill || 1000,
                team: options.team,
                partySize: options.partySize || 1
            };

            this.searchLoop(searchConfig);
        } catch (error) {
            Logger.error('Failed to start matchmaking:', error);
            this.cancelMatchmaking();
            throw error;
        }
    }

    async searchLoop(config) {
        if (!this.searching) return;

        try {
            const match = await this.findMatch(config);
            if (match) {
                await this.joinMatch(match);
            } else {
                const elapsedTime = Date.now() - this.searchStartTime;
                
                if (elapsedTime >= this.searchTimeout) {
                    this.emit('searchTimeout');
                    this.cancelMatchmaking();
                    return;
                }

                // Expand skill range over time
                const expansions = Math.floor(elapsedTime / this.expandRangeInterval);
                const currentSkillRange = Math.min(
                    this.skillRange + (expansions * 100),
                    this.maxSkillRange
                );

                // Try again with expanded range
                setTimeout(() => this.searchLoop({
                    ...config,
                    skillRange: currentSkillRange
                }), 2000);
            }
        } catch (error) {
            Logger.error('Error in matchmaking loop:', error);
            this.cancelMatchmaking();
        }
    }

    async findMatch(config) {
        const matchesRef = collection(db, 'matches');
        const now = Date.now();

        // Query for suitable matches
        const q = query(matchesRef, 
            where('status', '==', 'waiting'),
            where('gameMode', '==', config.gameMode),
            where('region', '==', config.region),
            where('skill', '>=', config.skill - config.skillRange),
            where('skill', '<=', config.skill + config.skillRange)
        );

        const querySnapshot = await getDocs(q);
        
        // Filter and sort matches
        const suitableMatches = [];
        querySnapshot.forEach(doc => {
            const match = { id: doc.id, ...doc.data() };
            
            // Check if match is still valid
            if (now - match.createdAt > 30000) return; // Skip matches older than 30 seconds
            
            // Check if there's room for the party
            if (match.players.length + config.partySize > match.maxPlayers) return;
            
            // Check team balance if applicable
            if (config.team && !this.canJoinTeam(match, config.team)) return;

            suitableMatches.push(match);
        });

        // Sort by best fit (closest skill level)
        suitableMatches.sort((a, b) => 
            Math.abs(a.skill - config.skill) - Math.abs(b.skill - config.skill)
        );

        return suitableMatches[0] || await this.createMatch(config);
    }

    async createMatch(config) {
        const matchData = {
            status: 'waiting',
            gameMode: config.gameMode,
            region: config.region,
            skill: config.skill,
            players: [],
            maxPlayers: this.getMaxPlayers(config.gameMode),
            teams: {
                team1: [],
                team2: []
            },
            createdAt: Date.now(),
            startTime: null,
            settings: this.getGameModeSettings(config.gameMode)
        };

        try {
            const matchRef = await addDoc(collection(db, 'matches'), matchData);
            return { id: matchRef.id, ...matchData };
        } catch (error) {
            Logger.error('Failed to create match:', error);
            throw error;
        }
    }

    async joinMatch(match) {
        if (!this.searching) return;

        const user = AuthSystem.getCurrentUser();
        
        try {
            const matchRef = doc(db, 'matches', match.id);
            await updateDoc(matchRef, {
                [`players.${user.uid}`]: {
                    id: user.uid,
                    name: user.displayName,
                    team: this.assignTeam(match),
                    joinedAt: Date.now()
                }
            });

            this.currentMatch = match;
            this.searching = false;
            this.emit('matchFound', match);

        } catch (error) {
            Logger.error('Failed to join match:', error);
            throw error;
        }
    }

    assignTeam(match) {
        if (!match.teams) return null;
        
        // Assign to team with fewer players
        return match.teams.team1.length <= match.teams.team2.length ? 'team1' : 'team2';
    }

    canJoinTeam(match, team) {
        if (!match.teams) return true;
        
        const maxTeamSize = Math.ceil(match.maxPlayers / 2);
        return match.teams[team].length < maxTeamSize;
    }

    getMaxPlayers(gameMode) {
        const maxPlayers = {
            tdm: 12,
            ffa: 8,
            ctf: 16,
            dom: 16
        };
        return maxPlayers[gameMode] || 12;
    }

    getGameModeSettings(gameMode) {
        const settings = {
            tdm: {
                scoreLimit: 75,
                timeLimit: 600,
                respawnTime: 5
            },
            ffa: {
                scoreLimit: 30,
                timeLimit: 600,
                respawnTime: 3
            },
            ctf: {
                scoreLimit: 3,
                timeLimit: 900,
                respawnTime: 7
            },
            dom: {
                scoreLimit: 200,
                timeLimit: 900,
                respawnTime: 5
            }
        };
        return settings[gameMode] || settings.tdm;
    }

    cancelMatchmaking() {
        if (!this.searching) return;

        this.searching = false;
        this.searchStartTime = null;
        this.emit('searchCancelled');
    }

    leaveMatch() {
        if (!this.currentMatch) return;

        const user = AuthSystem.getCurrentUser();
        const matchRef = doc(db, 'matches', this.currentMatch.id);

        updateDoc(matchRef, {
            [`players.${user.uid}`]: null
        }).catch(error => {
            Logger.error('Failed to leave match:', error);
        });

        this.currentMatch = null;
        this.emit('matchLeft');
    }

    getMatchmakingStatus() {
        if (!this.searching) return { status: 'idle' };

        const elapsedTime = Date.now() - this.searchStartTime;
        return {
            status: 'searching',
            elapsedTime,
            timeout: this.searchTimeout,
            expandedRange: Math.min(
                this.skillRange + (Math.floor(elapsedTime / this.expandRangeInterval) * 100),
                this.maxSkillRange
            )
        };
    }

    dispose() {
        this.cancelMatchmaking();
        if (this.currentMatch) {
            this.leaveMatch();
        }
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new MatchmakingSystem(); 