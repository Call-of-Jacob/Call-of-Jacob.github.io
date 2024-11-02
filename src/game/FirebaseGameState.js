import { ref, onValue, set, update } from 'firebase/database';
import { realtime } from '../config/firebase';

class FirebaseGameState {
    constructor() {
        this.gameRef = ref(realtime, 'games');
        this.playersRef = ref(realtime, 'players');
        this.currentGame = null;
        this.currentPlayer = null;
        this.listeners = new Map();
    }

    async createGame(gameConfig) {
        const gameId = crypto.randomUUID();
        const gameData = {
            id: gameId,
            config: gameConfig,
            state: 'waiting',
            players: {},
            startTime: null,
            lastUpdate: Date.now()
        };

        await set(ref(realtime, `games/${gameId}`), gameData);
        this.currentGame = gameId;
        return gameId;
    }

    async joinGame(gameId, player) {
        const playerRef = ref(realtime, `games/${gameId}/players/${player.id}`);
        await set(playerRef, {
            id: player.id,
            name: player.name,
            team: player.team,
            state: 'ready',
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            health: 100,
            lastUpdate: Date.now()
        });

        this.currentGame = gameId;
        this.currentPlayer = player.id;
        this.setupGameListeners(gameId);
    }

    setupGameListeners(gameId) {
        // Listen for game state changes
        const gameStateRef = ref(realtime, `games/${gameId}`);
        this.listeners.set('gameState', onValue(gameStateRef, (snapshot) => {
            const gameState = snapshot.val();
            this.handleGameStateUpdate(gameState);
        }));

        // Listen for player updates
        const playersRef = ref(realtime, `games/${gameId}/players`);
        this.listeners.set('players', onValue(playersRef, (snapshot) => {
            const players = snapshot.val();
            this.handlePlayersUpdate(players);
        }));
    }

    async updatePlayerState(state) {
        if (!this.currentGame || !this.currentPlayer) return;

        const updates = {
            [`games/${this.currentGame}/players/${this.currentPlayer}/position`]: state.position,
            [`games/${this.currentGame}/players/${this.currentPlayer}/rotation`]: state.rotation,
            [`games/${this.currentGame}/players/${this.currentPlayer}/health`]: state.health,
            [`games/${this.currentGame}/players/${this.currentPlayer}/lastUpdate`]: Date.now()
        };

        await update(ref(realtime), updates);
    }

    handleGameStateUpdate(gameState) {
        // Update local game state
        game.updateGameState(gameState);
    }

    handlePlayersUpdate(players) {
        // Update other players' states
        Object.entries(players).forEach(([playerId, playerState]) => {
            if (playerId !== this.currentPlayer) {
                game.updatePlayerState(playerId, playerState);
            }
        });
    }

    async leaveGame() {
        if (!this.currentGame || !this.currentPlayer) return;

        // Remove player from game
        await set(ref(realtime, `games/${this.currentGame}/players/${this.currentPlayer}`), null);

        // Cleanup listeners
        this.listeners.forEach((unsubscribe) => unsubscribe());
        this.listeners.clear();

        this.currentGame = null;
        this.currentPlayer = null;
    }
}

export default new FirebaseGameState(); 