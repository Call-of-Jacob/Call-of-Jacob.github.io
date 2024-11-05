import { getDatabase, ref, set, onValue, query, orderByChild } from 'firebase/database';
import { auth } from '../config/firebase';

class MatchmakingService {
    constructor() {
        this.currentMatch = null;
        this.onMatchFound = null;
    }

    async startMatchmaking(options = {}) {
        console.log('Matchmaking started with options:', options);
    }

    cancelMatchmaking() {
        console.log('Matchmaking cancelled');
    }

    joinMatch(matchId) {
        this.currentMatch = matchId;
        if (this.onMatchFound) {
            this.onMatchFound(matchId);
        }
    }
}

export default new MatchmakingService(); 