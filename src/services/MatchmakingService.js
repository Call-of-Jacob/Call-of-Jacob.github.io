import { getDatabase, ref, set, onValue, query, orderByChild } from 'firebase/database';
import { auth } from '../config/firebase';

class MatchmakingService {
    constructor() {
        this.db = getDatabase();
        this.queueRef = ref(this.db, 'matchmaking_queue');
        this.searching = false;
        this.matchCriteria = null;
        this.onMatchFound = null;
    }

    async startMatchmaking(criteria = {}) {
        if (!auth.currentUser) throw new Error('Must be authenticated');
        
        this.matchCriteria = {
            skill: criteria.skill || 1000,
            gameMode: criteria.gameMode || 'deathmatch',
            region: criteria.region || 'auto',
            timestamp: Date.now()
        };

        // Add player to queue
        await set(ref(this.db, `matchmaking_queue/${auth.currentUser.uid}`), {
            userId: auth.currentUser.uid,
            username: auth.currentUser.displayName,
            ...this.matchCriteria
        });

        this.searching = true;
        this.startListeningForMatch();
    }

    startListeningForMatch() {
        // Listen for players in queue
        const queueQuery = query(this.queueRef, orderByChild('timestamp'));
        
        onValue(queueQuery, async (snapshot) => {
            if (!this.searching) return;

            const players = [];
            snapshot.forEach(child => {
                players.push(child.val());
            });

            const match = this.findMatch(players);
            if (match) {
                await this.createMatch(match);
            }
        });
    }

    findMatch(players) {
        if (!this.matchCriteria) return null;

        // Filter players by criteria
        const eligiblePlayers = players.filter(player => {
            return player.gameMode === this.matchCriteria.gameMode &&
                   player.region === this.matchCriteria.region &&
                   Math.abs(player.skill - this.matchCriteria.skill) <= 200 &&
                   player.userId !== auth.currentUser.uid;
        });

        // Need at least one other player
        if (eligiblePlayers.length === 0) return null;

        // Return matched players
        return [
            { userId: auth.currentUser.uid, ...this.matchCriteria },
            ...eligiblePlayers.slice(0, 11) // Max 12 players per match
        ];
    }

    async createMatch(players) {
        const matchId = crypto.randomUUID();
        const matchRef = ref(this.db, `matches/${matchId}`);

        // Create match
        await set(matchRef, {
            id: matchId,
            state: 'starting',
            gameMode: this.matchCriteria.gameMode,
            region: this.matchCriteria.region,
            players: players.reduce((acc, player) => {
                acc[player.userId] = {
                    id: player.userId,
                    username: player.username,
                    team: this.assignTeam(player, players.length),
                    ready: false
                };
                return acc;
            }, {}),
            created: Date.now()
        });

        // Remove players from queue
        for (const player of players) {
            await set(ref(this.db, `matchmaking_queue/${player.userId}`), null);
        }

        if (this.onMatchFound) {
            this.onMatchFound(matchId);
        }

        this.searching = false;
    }

    assignTeam(player, totalPlayers) {
        if (this.matchCriteria.gameMode === 'deathmatch') {
            return 'ffa';
        }
        return totalPlayers % 2 === 0 ? 'alpha' : 'bravo';
    }

    async cancelMatchmaking() {
        if (!auth.currentUser) return;
        
        this.searching = false;
        await set(ref(this.db, `matchmaking_queue/${auth.currentUser.uid}`), null);
    }
}

export default new MatchmakingService(); 