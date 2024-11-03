import { realtime } from '../config/firebase';
import { ref, onValue, set, update } from 'firebase/database';

class NetworkManager {
    constructor() {
        this.gameRef = null;
        this.playerRef = null;
        this.listeners = new Map();
    }

    connect(gameId, playerId) {
        this.gameRef = ref(realtime, `games/${gameId}`);
        this.playerRef = ref(realtime, `games/${gameId}/players/${playerId}`);
        
        this.setupListeners();
    }

    setupListeners() {
        // Listen for game state updates
        this.listeners.set('gameState', onValue(this.gameRef, snapshot => {
            const gameState = snapshot.val();
            if (gameState) {
                game.handleGameState(gameState);
            }
        }));
    }

    sendInput(input) {
        if (!this.playerRef) return;
        
        update(this.playerRef, {
            input: input,
            timestamp: Date.now()
        });
    }

    disconnect() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners.clear();
        
        if (this.playerRef) {
            set(this.playerRef, null);
        }
        
        this.gameRef = null;
        this.playerRef = null;
    }

    update() {
        // Handle any network-related updates
    }
}

export default NetworkManager; 