import { 
    getFirestore, 
    collection, 
    doc, 
    setDoc, 
    updateDoc, 
    onSnapshot,
    query,
    where,
    serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { getDatabase, ref, onValue, set, update } from 'firebase/database';

class FirestoreGameManager {
    constructor() {
        this.db = getFirestore();
        this.realtime = getDatabase();
        this.analytics = getAnalytics();
        this.gameStates = collection(this.db, 'games');
        this.playerStates = collection(this.db, 'players');
        this.currentGame = null;
        this.currentPlayer = null;
        this.listeners = new Map();
    }

    async createGame(gameConfig) {
        try {
            const gameRef = doc(this.gameStates);
            const gameData = {
                id: gameRef.id,
                config: gameConfig,
                state: 'waiting',
                players: {},
                startTime: null,
                lastUpdate: serverTimestamp(),
                createdAt: serverTimestamp()
            };

            await setDoc(gameRef, gameData);
            
            // Set up real-time game state
            await set(ref(this.realtime, `games/${gameRef.id}`), {
                ...gameData,
                lastUpdate: Date.now()
            });

            this.currentGame = gameRef.id;
            
            // Log game creation
            logEvent(this.analytics, 'game_created', {
                game_id: gameRef.id,
                game_mode: gameConfig.mode
            });

            return gameRef.id;
        } catch (error) {
            console.error('Error creating game:', error);
            throw error;
        }
    }

    async joinGame(gameId, player) {
        try {
            const gameRef = doc(this.gameStates, gameId);
            const playerRef = doc(this.playerStates, player.id);

            // Create player document
            await setDoc(playerRef, {
                id: player.id,
                name: player.name,
                team: player.team,
                state: 'ready',
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                health: 100,
                lastUpdate: serverTimestamp()
            });

            // Update game with new player
            await updateDoc(gameRef, {
                [`players.${player.id}`]: playerRef,
                lastUpdate: serverTimestamp()
            });

            // Set up real-time player state
            await set(ref(this.realtime, `games/${gameId}/players/${player.id}`), {
                ...player,
                lastUpdate: Date.now()
            });

            this.currentGame = gameId;
            this.currentPlayer = player.id;
            this.setupGameListeners(gameId);

            // Log player join
            logEvent(this.analytics, 'player_joined_game', {
                game_id: gameId,
                player_id: player.id
            });

        } catch (error) {
            console.error('Error joining game:', error);
            throw error;
        }
    }

    setupGameListeners() {
        if (!this.currentGame) return;

        // Listen for game state changes in Firestore
        const gameRef = doc(this.gameStates, this.currentGame);
        this.listeners.set('gameState', onSnapshot(gameRef, (snapshot) => {
            const gameState = snapshot.data();
            this.handleGameStateUpdate(gameState);
        }));

        // Listen for real-time player updates
        const gameStateRef = ref(this.realtime, `games/${this.currentGame}`);
        onValue(gameStateRef, (snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.handleRealtimeUpdate(gameState);
            }
        });

        // Listen for player updates in Firestore
        const playersQuery = query(
            this.playerStates, 
            where('gameId', '==', this.currentGame)
        );
        
        this.listeners.set('players', onSnapshot(playersQuery, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                const player = change.doc.data();
                if (change.type === 'added' || change.type === 'modified') {
                    this.handlePlayerUpdate(player);
                } else if (change.type === 'removed') {
                    this.handlePlayerRemoved(player.id);
                }
            });
        }));
    }

    async updatePlayerState(state) {
        if (!this.currentGame || !this.currentPlayer) return;

        try {
            // Update Firestore
            const playerRef = doc(this.playerStates, this.currentPlayer);
            await updateDoc(playerRef, {
                position: state.position,
                rotation: state.rotation,
                health: state.health,
                lastUpdate: serverTimestamp()
            });

            // Update Realtime Database
            const realtimeRef = ref(
                this.realtime, 
                `games/${this.currentGame}/players/${this.currentPlayer}`
            );
            await update(realtimeRef, {
                ...state,
                lastUpdate: Date.now()
            });

        } catch (error) {
            console.error('Error updating player state:', error);
        }
    }

    handleGameStateUpdate(gameState) {
        // Update local game state
        game.updateGameState(gameState);

        // Log state changes
        logEvent(this.analytics, 'game_state_changed', {
            game_id: this.currentGame,
            new_state: gameState.state
        });
    }

    handleRealtimeUpdate(gameState) {
        // Handle real-time updates (positions, rotations, etc.)
        Object.entries(gameState.players || {}).forEach(([playerId, playerState]) => {
            if (playerId !== this.currentPlayer) {
                game.updatePlayerState(playerId, playerState);
            }
        });
    }

    handlePlayerUpdate(player) {
        if (player.id !== this.currentPlayer) {
            game.updatePlayerState(player.id, player);
        }
    }

    handlePlayerRemoved(playerId) {
        game.removePlayer(playerId);
        
        logEvent(this.analytics, 'player_left_game', {
            game_id: this.currentGame,
            player_id: playerId
        });
    }

    async leaveGame() {
        if (!this.currentGame || !this.currentPlayer) return;

        try {
            // Update Firestore
            const playerRef = doc(this.playerStates, this.currentPlayer);
            await updateDoc(playerRef, {
                state: 'disconnected',
                lastUpdate: serverTimestamp()
            });

            // Remove from Realtime Database
            await set(
                ref(this.realtime, `games/${this.currentGame}/players/${this.currentPlayer}`),
                null
            );

            // Cleanup listeners
            this.listeners.forEach((unsubscribe) => unsubscribe());
            this.listeners.clear();

            this.currentGame = null;
            this.currentPlayer = null;

            logEvent(this.analytics, 'player_left_game', {
                game_id: this.currentGame,
                player_id: this.currentPlayer
            });

        } catch (error) {
            console.error('Error leaving game:', error);
        }
    }

    async saveGameState(state) {
        if (!this.currentGame) return;

        try {
            // Update Firestore
            const gameRef = doc(this.gameStates, this.currentGame);
            await updateDoc(gameRef, {
                state: state,
                lastUpdate: serverTimestamp()
            });

            // Update Realtime Database
            await update(ref(this.realtime, `games/${this.currentGame}`), {
                state: state,
                lastUpdate: Date.now()
            });

            logEvent(this.analytics, 'game_state_saved', {
                game_id: this.currentGame
            });

        } catch (error) {
            console.error('Error saving game state:', error);
        }
    }
}

export default new FirestoreGameManager(); 