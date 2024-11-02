class NetworkClient {
    constructor() {
        this.socket = null;
        this.serverUpdateRate = 60; // Updates per second
        this.lastUpdateTime = 0;
        this.interpolationDelay = 100; // ms
        this.playerStates = new Map();
        this.pendingInputs = [];
        this.lastProcessedInput = 0;
        this.ping = 0;
    }

    connect(serverUrl) {
        return new Promise((resolve, reject) => {
            this.socket = io(serverUrl);

            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.setupEventHandlers();
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Connection failed:', error);
                reject(error);
            });
        });
    }

    setupEventHandlers() {
        this.socket.on('game_state', this.handleGameState.bind(this));
        this.socket.on('player_joined', this.handlePlayerJoined.bind(this));
        this.socket.on('player_left', this.handlePlayerLeft.bind(this));
        this.socket.on('input_processed', this.handleInputProcessed.bind(this));
    }

    sendInput(input) {
        input.sequence = ++this.lastProcessedInput;
        this.pendingInputs.push(input);
        this.socket.emit('player_input', input);
    }

    handleGameState(state) {
        // Update ping
        this.ping = Date.now() - state.timestamp;

        // Process server state
        for (const [playerId, playerState] of Object.entries(state.players)) {
            if (!this.playerStates.has(playerId)) {
                this.playerStates.set(playerId, []);
            }

            const stateBuffer = this.playerStates.get(playerId);
            stateBuffer.push({
                timestamp: state.timestamp,
                state: playerState
            });

            // Keep only recent states for interpolation
            while (stateBuffer.length > 0 && 
                   state.timestamp - stateBuffer[0].timestamp > 1000) {
                stateBuffer.shift();
            }
        }

        // Process server reconciliation
        if (state.lastProcessedInput > this.lastProcessedInput) {
            this.pendingInputs = this.pendingInputs.filter(
                input => input.sequence > state.lastProcessedInput
            );
        }
    }

    getInterpolatedState(timestamp) {
        const states = {};

        for (const [playerId, stateBuffer] of this.playerStates.entries()) {
            if (stateBuffer.length < 2) continue;

            const renderTimestamp = timestamp - this.interpolationDelay;

            // Find the two states to interpolate between
            let previousState = stateBuffer[0];
            let nextState = stateBuffer[1];

            for (let i = 1; i < stateBuffer.length; i++) {
                if (stateBuffer[i].timestamp > renderTimestamp) {
                    previousState = stateBuffer[i - 1];
                    nextState = stateBuffer[i];
                    break;
                }
            }

            // Calculate interpolation factor
            const alpha = (renderTimestamp - previousState.timestamp) / 
                         (nextState.timestamp - previousState.timestamp);

            // Interpolate state
            states[playerId] = this.interpolateState(
                previousState.state,
                nextState.state,
                alpha
            );
        }

        return states;
    }

    interpolateState(previous, next, alpha) {
        return {
            position: {
                x: previous.position.x + (next.position.x - previous.position.x) * alpha,
                y: previous.position.y + (next.position.y - previous.position.y) * alpha,
                z: previous.position.z + (next.position.z - previous.position.z) * alpha
            },
            rotation: {
                x: previous.rotation.x + (next.rotation.x - previous.rotation.x) * alpha,
                y: previous.rotation.y + (next.rotation.y - previous.rotation.y) * alpha,
                z: previous.rotation.z + (next.rotation.z - previous.rotation.z) * alpha
            }
        };
    }

    handlePlayerJoined(player) {
        gameState.addPlayer(player);
    }

    handlePlayerLeft(playerId) {
        gameState.removePlayer(playerId);
        this.playerStates.delete(playerId);
    }

    handleInputProcessed(data) {
        this.lastProcessedInput = Math.max(this.lastProcessedInput, data.sequence);
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
} 