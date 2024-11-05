import { EventEmitter } from 'events';
import Logger from '../../utils/Logger';

class GameMode {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.description = config.description;
        this.minPlayers = config.minPlayers;
        this.maxPlayers = config.maxPlayers;
        this.teamBased = config.teamBased;
        this.scoreLimit = config.scoreLimit;
        this.timeLimit = config.timeLimit;
        this.respawnTime = config.respawnTime;
        this.friendlyFire = config.friendlyFire;
        this.objectives = config.objectives || [];
        this.rules = config.rules || {};
    }

    validateGameState(state) {
        // Implement mode-specific validation
        return true;
    }

    calculateScore(event) {
        // Implement mode-specific scoring
        return 0;
    }

    checkWinCondition(state) {
        // Implement mode-specific win conditions
        return null;
    }
}

class GameModeSystem extends EventEmitter {
    constructor() {
        super();
        this.modes = new Map();
        this.currentMode = null;
        this.gameState = null;
        this.scoreboards = new Map();
        this.objectives = new Map();
        this.initialized = false;
    }

    init() {
        try {
            this.registerDefaultModes();
            this.initialized = true;
            Logger.info('Game mode system initialized');
        } catch (error) {
            Logger.error('Failed to initialize game mode system:', error);
            throw error;
        }
    }

    registerDefaultModes() {
        // Team Deathmatch
        this.registerMode(new GameMode({
            id: 'tdm',
            name: 'Team Deathmatch',
            description: 'Two teams battle for supremacy',
            minPlayers: 4,
            maxPlayers: 16,
            teamBased: true,
            scoreLimit: 75,
            timeLimit: 600, // 10 minutes
            respawnTime: 5,
            friendlyFire: false,
            rules: {
                killScore: 1,
                teamKillPenalty: -1
            }
        }));

        // Free-for-All
        this.registerMode(new GameMode({
            id: 'ffa',
            name: 'Free for All',
            description: 'Every soldier for themselves',
            minPlayers: 4,
            maxPlayers: 12,
            teamBased: false,
            scoreLimit: 30,
            timeLimit: 600,
            respawnTime: 3,
            friendlyFire: true,
            rules: {
                killScore: 1,
                deathPenalty: 0
            }
        }));

        // Capture the Flag
        this.registerMode(new GameMode({
            id: 'ctf',
            name: 'Capture the Flag',
            description: 'Capture the enemy flag while defending your own',
            minPlayers: 6,
            maxPlayers: 20,
            teamBased: true,
            scoreLimit: 3,
            timeLimit: 900, // 15 minutes
            respawnTime: 7,
            friendlyFire: false,
            objectives: ['flag_capture', 'flag_defend'],
            rules: {
                captureScore: 1,
                returnScore: 0.5,
                killScore: 0.1
            }
        }));

        // Domination
        this.registerMode(new GameMode({
            id: 'dom',
            name: 'Domination',
            description: 'Control strategic points to win',
            minPlayers: 6,
            maxPlayers: 24,
            teamBased: true,
            scoreLimit: 200,
            timeLimit: 900,
            respawnTime: 5,
            friendlyFire: false,
            objectives: ['point_capture', 'point_defend'],
            rules: {
                captureScore: 5,
                tickScore: 1,
                killScore: 0.1
            }
        }));
    }

    registerMode(mode) {
        this.modes.set(mode.id, mode);
    }

    async startMode(modeId, config = {}) {
        if (!this.modes.has(modeId)) {
            throw new Error(`Game mode not found: ${modeId}`);
        }

        try {
            this.currentMode = this.modes.get(modeId);
            this.gameState = {
                mode: modeId,
                startTime: Date.now(),
                endTime: Date.now() + (this.currentMode.timeLimit * 1000),
                scores: new Map(),
                objectives: new Map(),
                events: []
            };

            // Initialize scoreboards
            if (this.currentMode.teamBased) {
                this.scoreboards.set('team1', 0);
                this.scoreboards.set('team2', 0);
            }

            // Initialize objectives
            this.currentMode.objectives.forEach(objective => {
                this.objectives.set(objective, {
                    status: 'neutral',
                    owner: null,
                    progress: 0
                });
            });

            this.emit('modeStarted', {
                mode: this.currentMode,
                config,
                state: this.gameState
            });

        } catch (error) {
            Logger.error(`Failed to start game mode ${modeId}:`, error);
            throw error;
        }
    }

    handleGameEvent(event) {
        if (!this.currentMode || !this.gameState) return;

        try {
            // Calculate score for the event
            const score = this.currentMode.calculateScore(event);

            // Update scores
            if (this.currentMode.teamBased) {
                const currentScore = this.scoreboards.get(event.team) || 0;
                this.scoreboards.set(event.team, currentScore + score);
            } else {
                const currentScore = this.gameState.scores.get(event.playerId) || 0;
                this.gameState.scores.set(event.playerId, currentScore + score);
            }

            // Record event
            this.gameState.events.push({
                ...event,
                timestamp: Date.now(),
                score
            });

            // Check win conditions
            const winner = this.checkWinCondition();
            if (winner) {
                this.endGame(winner);
            }

            this.emit('gameEvent', event);

        } catch (error) {
            Logger.error('Error handling game event:', error);
        }
    }

    updateObjective(objectiveId, update) {
        if (!this.objectives.has(objectiveId)) return;

        const objective = this.objectives.get(objectiveId);
        Object.assign(objective, update);

        this.emit('objectiveUpdated', {
            objectiveId,
            ...objective
        });
    }

    checkWinCondition() {
        if (!this.currentMode || !this.gameState) return null;

        // Time limit check
        if (Date.now() >= this.gameState.endTime) {
            return this.getWinnerByScore();
        }

        // Score limit check
        if (this.currentMode.teamBased) {
            for (const [team, score] of this.scoreboards.entries()) {
                if (score >= this.currentMode.scoreLimit) {
                    return { winner: team, reason: 'score_limit' };
                }
            }
        } else {
            for (const [playerId, score] of this.gameState.scores.entries()) {
                if (score >= this.currentMode.scoreLimit) {
                    return { winner: playerId, reason: 'score_limit' };
                }
            }
        }

        // Mode-specific win conditions
        return this.currentMode.checkWinCondition(this.gameState);
    }

    getWinnerByScore() {
        if (this.currentMode.teamBased) {
            const team1Score = this.scoreboards.get('team1') || 0;
            const team2Score = this.scoreboards.get('team2') || 0;
            
            if (team1Score === team2Score) {
                return { winner: 'draw', reason: 'time_limit' };
            }
            return {
                winner: team1Score > team2Score ? 'team1' : 'team2',
                reason: 'time_limit'
            };
        } else {
            let highestScore = -1;
            let winner = null;
            
            for (const [playerId, score] of this.gameState.scores.entries()) {
                if (score > highestScore) {
                    highestScore = score;
                    winner = playerId;
                } else if (score === highestScore) {
                    winner = 'draw';
                }
            }
            
            return { winner, reason: 'time_limit' };
        }
    }

    endGame(result) {
        this.emit('gameEnded', {
            mode: this.currentMode.id,
            duration: Date.now() - this.gameState.startTime,
            result,
            finalScores: this.currentMode.teamBased ? 
                Object.fromEntries(this.scoreboards) : 
                Object.fromEntries(this.gameState.scores),
            events: this.gameState.events
        });

        this.cleanup();
    }

    cleanup() {
        this.currentMode = null;
        this.gameState = null;
        this.scoreboards.clear();
        this.objectives.clear();
    }

    dispose() {
        this.cleanup();
        this.modes.clear();
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new GameModeSystem(); 