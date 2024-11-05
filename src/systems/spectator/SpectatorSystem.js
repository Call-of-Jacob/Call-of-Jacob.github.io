import { EventEmitter } from 'events';
import Logger from '../../utils/Logger';

class SpectatorSystem extends EventEmitter {
    constructor() {
        super();
        this.spectators = new Map();
        this.spectatedPlayer = null;
        this.spectatorMode = 'follow'; // 'follow' or 'free'
        this.camera = null;
        this.controls = null;
        this.initialized = false;
        this.spectatorModes = {
            FOLLOW: 'follow',
            FREE: 'free',
            FIRST_PERSON: 'firstPerson',
            THIRD_PERSON: 'thirdPerson'
        };
    }

    async init(camera, scene) {
        try {
            this.camera = camera;
            this.scene = scene;
            this.setupControls();
            this.initialized = true;
            Logger.info('Spectator system initialized');
        } catch (error) {
            Logger.error('Failed to initialize spectator system:', error);
            throw error;
        }
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, document.getElementById('game-canvas'));
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 100;
        this.controls.enabled = false;
    }

    enterSpectatorMode(playerId = null) {
        if (!this.initialized) return;

        if (playerId) {
            this.spectatePlayer(playerId);
        } else {
            this.setSpectatorMode(this.spectatorModes.FREE);
        }

        this.emit('spectatorModeEntered', {
            mode: this.spectatorMode,
            spectatedPlayer: this.spectatedPlayer
        });
    }

    exitSpectatorMode() {
        if (!this.initialized) return;

        this.spectatedPlayer = null;
        this.controls.enabled = false;
        this.emit('spectatorModeExited');
    }

    spectatePlayer(playerId) {
        const player = this.getPlayer(playerId);
        if (!player) {
            Logger.warn(`Player not found: ${playerId}`);
            return;
        }

        this.spectatedPlayer = player;
        this.setSpectatorMode(this.spectatorModes.FOLLOW);
        this.emit('playerSpectated', playerId);
    }

    setSpectatorMode(mode) {
        if (!Object.values(this.spectatorModes).includes(mode)) {
            Logger.error(`Invalid spectator mode: ${mode}`);
            return;
        }

        this.spectatorMode = mode;
        this.updateCameraControls();
        this.emit('spectatorModeChanged', mode);
    }

    updateCameraControls() {
        switch (this.spectatorMode) {
            case this.spectatorModes.FREE:
                this.controls.enabled = true;
                break;
            case this.spectatorModes.FOLLOW:
                this.controls.enabled = false;
                break;
            case this.spectatorModes.FIRST_PERSON:
                this.controls.enabled = false;
                break;
            case this.spectatorModes.THIRD_PERSON:
                this.controls.enabled = true;
                this.controls.maxDistance = 10;
                break;
        }
    }

    update(deltaTime) {
        if (!this.initialized) return;

        if (this.spectatedPlayer) {
            this.updateSpectatorCamera(deltaTime);
        }

        if (this.controls.enabled) {
            this.controls.update();
        }
    }

    updateSpectatorCamera(deltaTime) {
        const player = this.spectatedPlayer;
        if (!player) return;

        switch (this.spectatorMode) {
            case this.spectatorModes.FOLLOW:
                this.updateFollowCamera(player);
                break;
            case this.spectatorModes.FIRST_PERSON:
                this.updateFirstPersonCamera(player);
                break;
            case this.spectatorModes.THIRD_PERSON:
                this.updateThirdPersonCamera(player);
                break;
        }
    }

    updateFollowCamera(player) {
        const offset = new THREE.Vector3(0, 5, -10);
        offset.applyQuaternion(player.quaternion);
        
        const targetPosition = player.position.clone().add(offset);
        this.camera.position.lerp(targetPosition, 0.1);
        this.camera.lookAt(player.position);
    }

    updateFirstPersonCamera(player) {
        const headOffset = new THREE.Vector3(0, 1.7, 0);
        const targetPosition = player.position.clone().add(headOffset);
        this.camera.position.copy(targetPosition);
        
        // Use player's rotation
        this.camera.quaternion.copy(player.quaternion);
    }

    updateThirdPersonCamera(player) {
        const offset = new THREE.Vector3(0, 2, -5);
        offset.applyQuaternion(player.quaternion);
        
        const targetPosition = player.position.clone().add(offset);
        this.camera.position.lerp(targetPosition, 0.1);
        this.camera.lookAt(player.position);
    }

    getPlayer(playerId) {
        // Implement player lookup based on your game's player management system
        return null;
    }

    addSpectator(userId) {
        this.spectators.set(userId, {
            id: userId,
            joinedAt: Date.now()
        });
        this.emit('spectatorJoined', userId);
    }

    removeSpectator(userId) {
        this.spectators.delete(userId);
        this.emit('spectatorLeft', userId);
    }

    getSpectatorCount() {
        return this.spectators.size;
    }

    getSpectators() {
        return Array.from(this.spectators.values());
    }

    nextPlayer() {
        if (!this.spectatedPlayer) return;

        const players = this.getAlivePlayers();
        const currentIndex = players.findIndex(p => p.id === this.spectatedPlayer.id);
        const nextIndex = (currentIndex + 1) % players.length;
        
        this.spectatePlayer(players[nextIndex].id);
    }

    previousPlayer() {
        if (!this.spectatedPlayer) return;

        const players = this.getAlivePlayers();
        const currentIndex = players.findIndex(p => p.id === this.spectatedPlayer.id);
        const previousIndex = (currentIndex - 1 + players.length) % players.length;
        
        this.spectatePlayer(players[previousIndex].id);
    }

    getAlivePlayers() {
        // Implement based on your game's player management system
        return [];
    }

    handlePlayerDeath(playerId) {
        if (this.spectatedPlayer?.id === playerId) {
            this.nextPlayer();
        }
    }

    dispose() {
        if (this.controls) {
            this.controls.dispose();
        }
        this.spectators.clear();
        this.spectatedPlayer = null;
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new SpectatorSystem(); 