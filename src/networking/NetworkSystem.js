import { EventEmitter } from 'events';
import { io } from 'socket.io-client';
import Logger from '../utils/Logger';
import GameStateSync from '../services/GameStateSync';

class NetworkSystem extends EventEmitter {
    constructor() {
        super();
        this.socket = null;
        this.connected = false;
        this.roomId = null;
        this.playerId = null;
        this.ping = 0;
        this.lastPingTime = 0;
        this.pingInterval = 1000;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.inputSequence = 0;
        this.pendingInputs = [];
        this.serverTimeOffset = 0;
        this.initialized = false;
    }

    async init(config) {
        try {
            this.setupSocket(config);
            this.setupEventHandlers();
            this.startPingInterval();
            this.initialized = true;
            Logger.info('Network system initialized');
        } catch (error) {
            Logger.error('Failed to initialize network system:', error);
            throw error;
        }
    }

    setupSocket(config) {
        this.socket = io(config.serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
            query: {
                gameVersion: config.version
            }
        });
    }

    setupEventHandlers() {
        this.socket.on('connect', () => this.handleConnect());
        this.socket.on('disconnect', () => this.handleDisconnect());
        this.socket.on('error', (error) => this.handleError(error));
        this.socket.on('gameState', (state) => this.handleGameState(state));
        this.socket.on('playerJoined', (player) => this.handlePlayerJoined(player));
        this.socket.on('playerLeft', (playerId) => this.handlePlayerLeft(playerId));
        this.socket.on('pong', () => this.handlePong());
        this.socket.on('serverTime', (time) => this.syncTime(time));
    }

    handleConnect() {
        this.connected = true;
        this.reconnectAttempts = 0;
        Logger.info('Connected to game server');
        this.emit('connected');
    }

    handleDisconnect() {
        this.connected = false;
        Logger.warn('Disconnected from game server');
        this.emit('disconnected');

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.attemptReconnect();
        } else {
            this.emit('connectionFailed');
        }
    }

    async attemptReconnect() {
        try {
            await this.socket.connect();
            if (this.roomId) {
                await this.joinRoom(this.roomId);
            }
        } catch (error) {
            Logger.error('Reconnection attempt failed:', error);
        }
    }

    handleError(error) {
        Logger.error('Network error:', error);
        this.emit('error', error);
    }

    handleGameState(state) {
        try {
            GameStateSync.processServerState(state);
            this.reconcileClientState(state);
            this.emit('stateUpdate', state);
        } catch (error) {
            Logger.error('Error processing game state:', error);
        }
    }

    handlePlayerJoined(player) {
        Logger.info(`Player joined: ${player.id}`);
        this.emit('playerJoined', player);
    }

    handlePlayerLeft(playerId) {
        Logger.info(`Player left: ${playerId}`);
        this.emit('playerLeft', playerId);
    }

    startPingInterval() {
        setInterval(() => {
            if (this.connected) {
                this.lastPingTime = performance.now();
                this.socket.emit('ping');
            }
        }, this.pingInterval);
    }

    handlePong() {
        this.ping = performance.now() - this.lastPingTime;
        this.emit('pingUpdate', this.ping);
    }

    syncTime(serverTime) {
        const clientTime = Date.now();
        this.serverTimeOffset = serverTime - clientTime;
    }

    getServerTime() {
        return Date.now() + this.serverTimeOffset;
    }

    async joinRoom(roomId) {
        if (!this.connected) {
            throw new Error('Not connected to server');
        }

        try {
            await this.socket.emit('joinRoom', { roomId });
            this.roomId = roomId;
            Logger.info(`Joined room: ${roomId}`);
            this.emit('roomJoined', roomId);
        } catch (error) {
            Logger.error('Failed to join room:', error);
            throw error;
        }
    }

    leaveRoom() {
        if (this.roomId) {
            this.socket.emit('leaveRoom', { roomId: this.roomId });
            this.roomId = null;
            this.emit('roomLeft');
        }
    }

    sendInput(input) {
        if (!this.connected || !this.roomId) return;

        input.sequence = ++this.inputSequence;
        input.timestamp = this.getServerTime();
        
        this.pendingInputs.push(input);
        this.socket.emit('playerInput', input);
    }

    reconcileClientState(serverState) {
        const lastProcessedInput = serverState.lastProcessedInput;
        
        // Remove older inputs
        this.pendingInputs = this.pendingInputs.filter(
            input => input.sequence > lastProcessedInput
        );

        // Reapply pending inputs
        this.pendingInputs.forEach(input => {
            GameStateSync.applyInput(input);
        });
    }

    sendPlayerState(state) {
        if (!this.connected || !this.roomId) return;

        this.socket.emit('playerState', {
            ...state,
            timestamp: this.getServerTime()
        });
    }

    broadcastEvent(event, data) {
        if (!this.connected || !this.roomId) return;

        this.socket.emit('gameEvent', {
            event,
            data,
            timestamp: this.getServerTime()
        });
    }

    dispose() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connected = false;
        this.roomId = null;
        this.pendingInputs = [];
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new NetworkSystem(); 