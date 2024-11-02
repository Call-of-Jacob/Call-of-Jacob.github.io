import { getAnalytics, logEvent } from 'firebase/analytics';

class GameAnalytics {
    constructor() {
        this.analytics = getAnalytics();
        this.sessionStartTime = Date.now();
    }

    // Player Events
    trackPlayerJoin(playerId, gameMode) {
        logEvent(this.analytics, 'player_join', {
            player_id: playerId,
            game_mode: gameMode,
            timestamp: Date.now()
        });
    }

    trackPlayerLeave(playerId, gameTime) {
        logEvent(this.analytics, 'player_leave', {
            player_id: playerId,
            session_duration: Date.now() - this.sessionStartTime,
            game_time: gameTime
        });
    }

    // Combat Events
    trackKill(killerId, victimId, weaponId, isHeadshot) {
        logEvent(this.analytics, 'player_kill', {
            killer_id: killerId,
            victim_id: victimId,
            weapon_id: weaponId,
            is_headshot: isHeadshot
        });
    }

    trackDeath(playerId, killerWeapon) {
        logEvent(this.analytics, 'player_death', {
            player_id: playerId,
            killer_weapon: killerWeapon
        });
    }

    // Progression Events
    trackLevelUp(playerId, newLevel, totalXP) {
        logEvent(this.analytics, 'level_up', {
            player_id: playerId,
            new_level: newLevel,
            total_xp: totalXP
        });
    }

    trackUnlock(playerId, itemId, itemType) {
        logEvent(this.analytics, 'item_unlock', {
            player_id: playerId,
            item_id: itemId,
            item_type: itemType
        });
    }

    // Match Events
    trackMatchStart(matchId, gameMode, mapId, playerCount) {
        logEvent(this.analytics, 'match_start', {
            match_id: matchId,
            game_mode: gameMode,
            map_id: mapId,
            player_count: playerCount
        });
    }

    trackMatchEnd(matchId, winningTeam, duration) {
        logEvent(this.analytics, 'match_end', {
            match_id: matchId,
            winning_team: winningTeam,
            duration: duration
        });
    }

    // Performance Events
    trackPerformanceMetric(metricName, value) {
        logEvent(this.analytics, 'performance_metric', {
            metric_name: metricName,
            value: value,
            timestamp: Date.now()
        });
    }

    // Error Events
    trackError(errorType, errorMessage, stackTrace) {
        logEvent(this.analytics, 'error_occurred', {
            error_type: errorType,
            error_message: errorMessage,
            stack_trace: stackTrace,
            timestamp: Date.now()
        });
    }

    // Custom Events
    trackCustomEvent(eventName, eventParams) {
        logEvent(this.analytics, eventName, {
            ...eventParams,
            timestamp: Date.now()
        });
    }
}

export default new GameAnalytics(); 