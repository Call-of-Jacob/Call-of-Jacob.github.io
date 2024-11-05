import { EventEmitter } from 'events';
import Logger from '../utils/Logger';

class GameStateManager extends EventEmitter {
    constructor() {
        super();
        this.states = {
            LOADING: 'loading',
            MENU: 'menu',
            PLAYING: 'playing',
            PAUSED: 'paused',
            GAME_OVER: 'gameOver',
            MATCHMAKING: 'matchmaking'
        };
        this.currentState = this.states.LOADING;
        this.previousState = null;
        this.stateData = new Map();
        this.stateHandlers = new Map();
        this.transitions = new Map();
        this.setupStateHandlers();
    }

    setupStateHandlers() {
        // Loading state
        this.registerState(this.states.LOADING, {
            enter: () => {
                Logger.info('Entering loading state');
                this.emit('loadingStarted');
            },
            exit: () => {
                Logger.info('Exiting loading state');
                this.emit('loadingComplete');
            },
            update: (deltaTime) => {
                // Update loading progress
            }
        });

        // Menu state
        this.registerState(this.states.MENU, {
            enter: () => {
                Logger.info('Entering menu state');
                this.emit('menuOpened');
            },
            exit: () => {
                Logger.info('Exiting menu state');
                this.emit('menuClosed');
            },
            update: (deltaTime) => {
                // Update menu animations
            }
        });

        // Playing state
        this.registerState(this.states.PLAYING, {
            enter: () => {
                Logger.info('Entering playing state');
                this.emit('gameStarted');
            },
            exit: () => {
                Logger.info('Exiting playing state');
                this.emit('gameStopped');
            },
            update: (deltaTime) => {
                // Update game logic
            }
        });

        // Paused state
        this.registerState(this.states.PAUSED, {
            enter: () => {
                Logger.info('Entering paused state');
                this.emit('gamePaused');
            },
            exit: () => {
                Logger.info('Exiting paused state');
                this.emit('gameResumed');
            },
            update: (deltaTime) => {
                // Update pause menu
            }
        });

        // Game over state
        this.registerState(this.states.GAME_OVER, {
            enter: (data) => {
                Logger.info('Entering game over state', data);
                this.emit('gameOver', data);
            },
            exit: () => {
                Logger.info('Exiting game over state');
            },
            update: (deltaTime) => {
                // Update game over screen
            }
        });

        // Matchmaking state
        this.registerState(this.states.MATCHMAKING, {
            enter: () => {
                Logger.info('Entering matchmaking state');
                this.emit('matchmakingStarted');
            },
            exit: () => {
                Logger.info('Exiting matchmaking state');
                this.emit('matchmakingEnded');
            },
            update: (deltaTime) => {
                // Update matchmaking progress
            }
        });
    }

    registerState(stateName, handlers) {
        this.stateHandlers.set(stateName, {
            enter: handlers.enter || (() => {}),
            exit: handlers.exit || (() => {}),
            update: handlers.update || (() => {})
        });
    }

    registerTransition(fromState, toState, validator) {
        const key = `${fromState}->${toState}`;
        this.transitions.set(key, validator || (() => true));
    }

    canTransition(fromState, toState) {
        const key = `${fromState}->${toState}`;
        const validator = this.transitions.get(key);
        return validator ? validator() : true;
    }

    async changeState(newState, stateData = {}) {
        if (newState === this.currentState) {
            Logger.warn('Attempting to change to the same state:', newState);
            return false;
        }

        if (!this.stateHandlers.has(newState)) {
            Logger.error('Invalid state:', newState);
            return false;
        }

        if (!this.canTransition(this.currentState, newState)) {
            Logger.warn('Invalid state transition:', this.currentState, '->', newState);
            return false;
        }

        try {
            // Exit current state
            const currentHandler = this.stateHandlers.get(this.currentState);
            await currentHandler.exit();

            // Store state data
            this.stateData.set(newState, stateData);

            // Update state tracking
            this.previousState = this.currentState;
            this.currentState = newState;

            // Enter new state
            const newHandler = this.stateHandlers.get(newState);
            await newHandler.enter(stateData);

            this.emit('stateChanged', {
                from: this.previousState,
                to: this.currentState,
                data: stateData
            });

            return true;
        } catch (error) {
            Logger.error('Error during state transition:', error);
            return false;
        }
    }

    update(deltaTime) {
        const currentHandler = this.stateHandlers.get(this.currentState);
        if (currentHandler && currentHandler.update) {
            currentHandler.update(deltaTime);
        }
    }

    getCurrentState() {
        return this.currentState;
    }

    getStateData(state = this.currentState) {
        return this.stateData.get(state);
    }

    isPaused() {
        return this.currentState === this.states.PAUSED;
    }

    isPlaying() {
        return this.currentState === this.states.PLAYING;
    }

    isInMenu() {
        return this.currentState === this.states.MENU;
    }

    isLoading() {
        return this.currentState === this.states.LOADING;
    }

    isGameOver() {
        return this.currentState === this.states.GAME_OVER;
    }

    isMatchmaking() {
        return this.currentState === this.states.MATCHMAKING;
    }
}

export default new GameStateManager(); 