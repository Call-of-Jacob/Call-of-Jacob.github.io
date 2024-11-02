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

class FirestoreGameState {
    constructor() {
        this.db = getFirestore();
        this.gameStates = collection(this.db, 'games');
        this.playerStates = collection(this.db, 'players');
        this.currentGame = null;
        this.currentPlayer = null;
        this.listeners = new Map();
    }

    async createGame(gameConfig) {
        const gameRef = doc(this.gameStates);
        const gameData = {
            id: gameRef.id,
            config: gameConfig,
            state: 'waiting',
            players: {},
            startTime: null,
            lastUpdate: serverTimestamp()
        };

        await setDoc(gameRef, gameData);
        this.currentGame = gameRef.id;
        return gameRef.id;
    }

    async joinGame(gameId, player) {
        const gameRef = doc(this.gameStates, gameId);
        const playerRef = doc(this.playerStates, player.id);

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

        await updateDoc(gameRef, {
            [`players.${player.id}`]: playerRef
        });

        this.currentGame = gameId;
        this.currentPlayer = player.id;
        this.setupGameListeners(gameId);
    }

    setupGameListeners(gameId) {
        // Listen for game state changes
        const gameRef = doc(this.gameStates, gameId);
        this.listeners.set('gameState', onSnapshot(gameRef, (snapshot) => {
            const gameState = snapshot.data();
            this.handleGameStateUpdate(gameState);
        }));

        // Listen for player updates
        const playersQuery = query(
            this.playerStates, 
            where('gameId', '==', gameId)
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

        const playerRef = doc(this.playerStates, this.currentPlayer);
        await updateDoc(playerRef, {
            position: state.position,
            rotation: state.rotation,
            health: state.health,
            lastUpdate: serverTimestamp()
        });
    }

    handleGameStateUpdate(gameState) {
        game.updateGameState(gameState);
    }

    handlePlayerUpdate(player) {
        if (player.id !== this.currentPlayer) {
            game.updatePlayerState(player.id, player);
        }
    }

    handlePlayerRemoved(playerId) {
        game.removePlayer(playerId);
    }

    async leaveGame() {
        if (!this.currentGame || !this.currentPlayer) return;

        const playerRef = doc(this.playerStates, this.currentPlayer);
        await updateDoc(playerRef, {
            state: 'disconnected',
            lastUpdate: serverTimestamp()
        });

        // Cleanup listeners
        this.listeners.forEach((unsubscribe) => unsubscribe());
        this.listeners.clear();

        this.currentGame = null;
        this.currentPlayer = null;
    }

    async saveGameState(state) {
        if (!this.currentGame) return;

        const gameRef = doc(this.gameStates, this.currentGame);
        await updateDoc(gameRef, {
            state: state,
            lastUpdate: serverTimestamp()
        });
    }
}

export default new FirestoreGameState(); 