import { getDatabase, ref, onValue, set, update } from 'firebase/database';
import Logger from '../utils/Logger';

class GameStateSync {
    constructor() {
        this.db = getDatabase();
        this.gameStates = new Map();
        this.localState = null;
        this.lastUpdateTime = 0;
        this.updateRate = 60; // Updates per second
        this.updateInterval = 1000 / this.updateRate;
        this.interpolationDelay = 100; // ms
        this.stateBuffer = new Map();
        this.listeners = new Map();
        this.roomId = null;
    }

    init(roomId) {
        this.roomId = roomId;
        this.setupStateSync();
        this.setupInterpolation();
    }

    setupStateSync() {
        const gameRef = ref(this.db, `games/${this.roomId}/state`);
        
        onValue(gameRef, (snapshot) => {
            try {
                const serverState = snapshot.val();
                if (!serverState) return;

                this.processServerState(serverState);
            } catch (error) {
                Logger.error('Error processing server state:', error);
            }
        });
    }

    processServerState(serverState) {
        const timestamp = Date.now();
        
        // Store state in buffer for interpolation
        for (const [playerId, playerState] of Object.entries(serverState.players)) {
            if (!this.stateBuffer.has(playerId)) {
                this.stateBuffer.set(playerId, []);
            }
            
            const buffer = this.stateBuffer.get(playerId);
            buffer.push({ ...playerState, timestamp });
            
            // Keep only last 1 second of states
            while (buffer.length > 0 && buffer[0].timestamp < timestamp - 1000) {
                buffer.shift();
            }
        }

        this.gameStates.set(timestamp, serverState);
        this.cleanupOldStates(timestamp);
    }

    cleanupOldStates(currentTime) {
        const maxAge = 1000; // 1 second
        for (const [timestamp, state] of this.gameStates) {
            if (currentTime - timestamp > maxAge) {
                this.gameStates.delete(timestamp);
            }
        }
    }

    setupInterpolation() {
        this.interpolationLoop = setInterval(() => {
            const renderTimestamp = Date.now() - this.interpolationDelay;
            this.interpolateStates(renderTimestamp);
        }, 16); // ~60fps
    }

    interpolateStates(renderTimestamp) {
        const interpolatedState = {
            players: {},
            gameObjects: {}
        };

        // Interpolate player states
        for (const [playerId, buffer] of this.stateBuffer) {
            if (buffer.length < 2) continue;

            let previousState = buffer[0];
            let nextState = buffer[1];

            // Find appropriate states to interpolate between
            for (let i = 1; i < buffer.length; i++) {
                if (buffer[i].timestamp > renderTimestamp) {
                    previousState = buffer[i - 1];
                    nextState = buffer[i];
                    break;
                }
            }

            const alpha = (renderTimestamp - previousState.timestamp) / 
                         (nextState.timestamp - previousState.timestamp);

            interpolatedState.players[playerId] = this.interpolatePlayerState(
                previousState,
                nextState,
                alpha
            );
        }

        this.notifyListeners('stateUpdate', interpolatedState);
    }

    interpolatePlayerState(previous, next, alpha) {
        return {
            position: {
                x: previous.position.x + (next.position.x - previous.position.x) * alpha,
                y: previous.position.y + (next.position.y - previous.position.y) * alpha,
                z: previous.position.z + (next.position.z - previous.position.z) * alpha
            },
            rotation: {
                x: this.interpolateAngle(previous.rotation.x, next.rotation.x, alpha),
                y: this.interpolateAngle(previous.rotation.y, next.rotation.y, alpha),
                z: this.interpolateAngle(previous.rotation.z, next.rotation.z, alpha)
            },
            animation: next.animation, // Don't interpolate animations
            health: Math.round(previous.health + (next.health - previous.health) * alpha)
        };
    }

    interpolateAngle(a1, a2, alpha) {
        const diff = a2 - a1;
        const shortestDiff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
        return a1 + shortestDiff * alpha;
    }

    updateLocalState(state) {
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateInterval) return;

        this.lastUpdateTime = now;
        this.localState = state;

        try {
            const updates = {};
            updates[`games/${this.roomId}/state/players/${state.playerId}`] = {
                ...state,
                timestamp: now
            };
            
            update(ref(this.db), updates);
        } catch (error) {
            Logger.error('Error updating local state:', error);
        }
    }

    addStateListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    removeStateListener(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
    }

    notifyListeners(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    Logger.error(`Error in state listener for event ${event}:`, error);
                }
            });
        }
    }

    dispose() {
        if (this.interpolationLoop) {
            clearInterval(this.interpolationLoop);
        }
        this.gameStates.clear();
        this.stateBuffer.clear();
        this.listeners.clear();
        this.localState = null;
    }
}

export default new GameStateSync(); 