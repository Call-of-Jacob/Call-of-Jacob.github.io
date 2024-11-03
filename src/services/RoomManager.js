import { getDatabase, ref, get, set, onValue, query, orderByChild, limitToFirst } from 'firebase/database';
import { auth } from '../config/firebase';

class RoomManager {
    constructor() {
        this.db = getDatabase();
        this.currentRoom = null;
        this.roomListeners = new Map();
    }

    async createRoom(config = {}) {
        if (!auth.currentUser) throw new Error('Must be authenticated');

        const roomData = {
            id: crypto.randomUUID(),
            host: auth.currentUser.uid,
            created: Date.now(),
            config: {
                maxPlayers: config.maxPlayers || 12,
                gameMode: config.gameMode || 'deathmatch',
                map: config.map || 'city',
                ...config
            },
            state: 'waiting',
            players: {},
            lastUpdate: Date.now()
        };

        const roomRef = ref(this.db, `rooms/${roomData.id}`);
        await set(roomRef, roomData);
        return roomData.id;
    }

    async findAvailableRoom(filters = {}) {
        const roomsRef = ref(this.db, 'rooms');
        const roomQuery = query(
            roomsRef,
            orderByChild('state'),
            limitToFirst(10)
        );

        const snapshot = await get(roomQuery);
        const rooms = [];

        snapshot.forEach((child) => {
            const room = child.val();
            if (room.state === 'waiting' && 
                Object.keys(room.players || {}).length < room.config.maxPlayers) {
                rooms.push(room);
            }
        });

        // Apply filters
        const filteredRooms = rooms.filter(room => {
            return (!filters.gameMode || room.config.gameMode === filters.gameMode) &&
                   (!filters.map || room.config.map === filters.map);
        });

        return filteredRooms[0]?.id;
    }

    async joinRoom(roomId) {
        if (!auth.currentUser) throw new Error('Must be authenticated');

        const roomRef = ref(this.db, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        const roomData = snapshot.val();

        if (!roomData) throw new Error('Room not found');
        if (roomData.state !== 'waiting') throw new Error('Room is not accepting players');
        if (Object.keys(roomData.players || {}).length >= roomData.config.maxPlayers) {
            throw new Error('Room is full');
        }

        // Add player to room
        await set(ref(this.db, `rooms/${roomId}/players/${auth.currentUser.uid}`), {
            id: auth.currentUser.uid,
            name: auth.currentUser.displayName,
            joined: Date.now(),
            ready: false
        });

        this.currentRoom = roomId;
        this.setupRoomListeners(roomId);
        return roomData;
    }

    setupRoomListeners(roomId) {
        // Listen for room state changes
        const roomRef = ref(this.db, `rooms/${roomId}`);
        this.roomListeners.set('room', onValue(roomRef, (snapshot) => {
            const roomData = snapshot.val();
            if (!roomData) return;

            if (roomData.state === 'starting') {
                this.handleGameStart(roomData);
            } else if (roomData.state === 'ended') {
                this.handleGameEnd(roomData);
            }
        }));

        // Listen for player changes
        const playersRef = ref(this.db, `rooms/${roomId}/players`);
        this.roomListeners.set('players', onValue(playersRef, (snapshot) => {
            const players = snapshot.val() || {};
            this.handlePlayersUpdate(players);
        }));
    }

    async setPlayerReady(ready = true) {
        if (!this.currentRoom || !auth.currentUser) return;

        await set(
            ref(this.db, `rooms/${this.currentRoom}/players/${auth.currentUser.uid}/ready`),
            ready
        );
    }

    async startGame() {
        if (!this.currentRoom || !auth.currentUser) return;

        const roomRef = ref(this.db, `rooms/${this.currentRoom}`);
        await set(ref(this.db, `rooms/${this.currentRoom}/state`), 'starting');
    }

    handleGameStart(roomData) {
        game.startMatch(roomData.config);
    }

    handleGameEnd(roomData) {
        game.endMatch(roomData.results);
    }

    handlePlayersUpdate(players) {
        game.updatePlayers(players);
    }

    async leaveRoom() {
        if (!this.currentRoom || !auth.currentUser) return;

        // Remove player from room
        await set(
            ref(this.db, `rooms/${this.currentRoom}/players/${auth.currentUser.uid}`),
            null
        );

        // Cleanup listeners
        this.roomListeners.forEach(unsubscribe => unsubscribe());
        this.roomListeners.clear();

        this.currentRoom = null;
    }
}

export default new RoomManager(); 