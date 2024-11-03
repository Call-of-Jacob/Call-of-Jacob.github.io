import { getDatabase, ref, onValue, set, update } from 'firebase/database';
import { auth } from '../config/firebase';

class GameStateSync {
    constructor() {
        this.db = getDatabase();
        this.currentRoom = null;
        this.players = new Map();
        this.lastUpdateTime = Date.now();
        this.updateRate = 1000 / 60; // 60 fps
    }

    async joinRoom(roomId) {
        if (!auth.currentUser) throw new Error('Must be authenticated');
        
        this.currentRoom = roomId;
        const playerRef = ref(this.db, `rooms/${roomId}/players/${auth.currentUser.uid}`);
        
        // Initialize player state
        await set(playerRef, {
            id: auth.currentUser.uid,
            name: auth.currentUser.displayName,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            health: 100,
            lastUpdate: Date.now()
        });

        // Listen for other players
        this.listenToRoomChanges(roomId);
    }

    listenToRoomChanges(roomId) {
        const roomRef = ref(this.db, `rooms/${roomId}`);
        onValue(roomRef, (snapshot) => {
            const roomData = snapshot.val();
            if (!roomData) return;

            // Update other players
            Object.entries(roomData.players || {}).forEach(([playerId, playerData]) => {
                if (playerId !== auth.currentUser.uid) {
                    this.updatePlayerState(playerId, playerData);
                }
            });
        });
    }

    updatePlayerState(playerId, state) {
        this.players.set(playerId, state);
        game.updatePlayerState(playerId, state);
    }

    async sendPlayerUpdate(state) {
        if (!this.currentRoom || !auth.currentUser) return;

        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateRate) return;
        
        const playerRef = ref(this.db, `rooms/${this.currentRoom}/players/${auth.currentUser.uid}`);
        await update(playerRef, {
            ...state,
            lastUpdate: now
        });

        this.lastUpdateTime = now;
    }

    async leaveRoom() {
        if (!this.currentRoom || !auth.currentUser) return;

        const playerRef = ref(this.db, `rooms/${this.currentRoom}/players/${auth.currentUser.uid}`);
        await set(playerRef, null);
        this.currentRoom = null;
        this.players.clear();
    }
}

export default new GameStateSync(); 