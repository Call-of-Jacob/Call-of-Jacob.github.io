const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Matchmaking Function
exports.findMatch = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { gameMode, region } = data;
    const db = admin.firestore();
    
    // Find available match or create new one
    const matchRef = await findOrCreateMatch(db, gameMode, region);
    
    return {
        matchId: matchRef.id,
        serverInfo: matchRef.data().serverInfo
    };
});

// Player Stats Update Function
exports.updatePlayerStats = functions.firestore
    .document('matches/{matchId}')
    .onUpdate(async (change, context) => {
        const matchData = change.after.data();
        const previousData = change.before.data();

        if (matchData.status === 'completed' && previousData.status !== 'completed') {
            await updateAllPlayersStats(matchData);
        }
    });

// Achievement Check Function
exports.checkAchievements = functions.firestore
    .document('players/{playerId}/stats/{statId}')
    .onWrite(async (change, context) => {
        const newStats = change.after.data();
        const playerId = context.params.playerId;
        
        const unlockedAchievements = await checkPlayerAchievements(playerId, newStats);
        if (unlockedAchievements.length > 0) {
            await grantAchievements(playerId, unlockedAchievements);
        }
    });

// Scheduled Cleanup Function
exports.cleanupInactiveMatches = functions.pubsub
    .schedule('every 15 minutes')
    .onRun(async (context) => {
        const db = admin.firestore();
        const threshold = Date.now() - (15 * 60 * 1000); // 15 minutes ago

        const snapshot = await db.collection('matches')
            .where('lastActivity', '<', threshold)
            .where('status', '!=', 'completed')
            .get();

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { status: 'abandoned' });
        });

        await batch.commit();
    });

// Helper Functions
async function findOrCreateMatch(db, gameMode, region) {
    const availableMatch = await db.collection('matches')
        .where('gameMode', '==', gameMode)
        .where('region', '==', region)
        .where('status', '==', 'waiting')
        .where('playerCount', '<', 12)
        .limit(1)
        .get();

    if (!availableMatch.empty) {
        return availableMatch.docs[0];
    }

    return await db.collection('matches').add({
        gameMode,
        region,
        status: 'waiting',
        playerCount: 0,
        created: admin.firestore.FieldValue.serverTimestamp(),
        serverInfo: await allocateGameServer(region)
    });
}

async function updateAllPlayersStats(matchData) {
    const batch = admin.firestore().batch();
    
    for (const [playerId, stats] of Object.entries(matchData.playerStats)) {
        const playerRef = admin.firestore().doc(`players/${playerId}`);
        batch.update(playerRef, {
            'stats.kills': admin.firestore.FieldValue.increment(stats.kills),
            'stats.deaths': admin.firestore.FieldValue.increment(stats.deaths),
            'stats.xp': admin.firestore.FieldValue.increment(stats.xpEarned)
        });
    }

    await batch.commit();
}

async function checkPlayerAchievements(playerId, stats) {
    const achievements = [];
    
    // Check various achievement conditions
    if (stats.kills >= 1000) achievements.push('VETERAN');
    if (stats.headshots >= 100) achievements.push('MARKSMAN');
    if (stats.winStreak >= 5) achievements.push('UNSTOPPABLE');
    
    return achievements;
}

async function grantAchievements(playerId, achievements) {
    const playerRef = admin.firestore().doc(`players/${playerId}`);
    
    await playerRef.update({
        achievements: admin.firestore.FieldValue.arrayUnion(...achievements)
    });

    // Notify player
    await admin.messaging().send({
        topic: playerId,
        data: {
            type: 'achievement_unlocked',
            achievements: JSON.stringify(achievements)
        }
    });
}

async function allocateGameServer(region) {
    // Implementation would depend on your server infrastructure
    // This is a placeholder
    return {
        ip: '10.0.0.1',
        port: 7777
    };
} 