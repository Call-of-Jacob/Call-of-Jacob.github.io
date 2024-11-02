class AdvancedChallengeSystem extends ChallengeSystem {
    constructor(progressionSystem) {
        super(progressionSystem);
        this.weaponChallenges = new Map();
        this.seasonalChallenges = new Set();
        this.initializeAdvancedChallenges();
    }

    initializeAdvancedChallenges() {
        // Weapon Mastery Challenges
        this.initializeWeaponChallenges();
        
        // Combat Challenges
        this.addCombatChallenges();
        
        // Tactical Challenges
        this.addTacticalChallenges();
        
        // Seasonal Challenges
        this.addSeasonalChallenges();
        
        // Secret Challenges
        this.addSecretChallenges();
    }

    initializeWeaponChallenges() {
        const weapons = ['M1_GARAND', 'THOMPSON', 'BAR', 'COLT_1911'];
        
        weapons.forEach(weapon => {
            this.weaponChallenges.set(weapon, [
                new Challenge(
                    `${weapon}_kills`,
                    `${weapon} Expert`,
                    `Get 500 kills with the ${weapon}`,
                    { type: 'weapon_kills', weapon: weapon, amount: 500 },
                    { xp: 5000, unlock: `${weapon}_SKIN_GOLD` }
                ),
                new Challenge(
                    `${weapon}_headshots`,
                    `${weapon} Marksman`,
                    `Get 100 headshot kills with the ${weapon}`,
                    { type: 'weapon_headshots', weapon: weapon, amount: 100 },
                    { xp: 3000, unlock: `${weapon}_CHARM` }
                ),
                new Challenge(
                    `${weapon}_longshots`,
                    `${weapon} Sniper`,
                    `Get 50 long-range kills with the ${weapon}`,
                    { type: 'weapon_longshots', weapon: weapon, amount: 50 },
                    { xp: 2000, unlock: `${weapon}_SCOPE` }
                )
            ]);
        });
    }

    addCombatChallenges() {
        this.addChallenge(new Challenge(
            'multikill_master',
            'Multikill Master',
            'Get 5 kills within 5 seconds',
            { type: 'multikill', amount: 5, timeWindow: 5 },
            { xp: 3000, unlock: 'CALLING_CARD_RAMPAGE' }
        ));

        this.addChallenge(new Challenge(
            'grenade_specialist',
            'Grenade Specialist',
            'Get 50 grenade kills',
            { type: 'grenade_kills', amount: 50 },
            { xp: 2000, unlock: 'EXTRA_GRENADE' }
        ));

        this.addChallenge(new Challenge(
            'melee_expert',
            'Melee Expert',
            'Get 100 melee kills',
            { type: 'melee_kills', amount: 100 },
            { xp: 2500, unlock: 'BAYONET' }
        ));
    }

    addTacticalChallenges() {
        this.addChallenge(new Challenge(
            'objective_master',
            'Objective Master',
            'Capture 50 objectives',
            { type: 'objective_captures', amount: 50 },
            { xp: 4000, unlock: 'EXTRA_SCORE_MULTIPLIER' }
        ));

        this.addChallenge(new Challenge(
            'team_player',
            'Team Player',
            'Get 100 assist kills',
            { type: 'assists', amount: 100 },
            { xp: 2000, unlock: 'SUPPORT_SCORE_BONUS' }
        ));

        this.addChallenge(new Challenge(
            'survivor',
            'Survivor',
            'Win 10 matches without dying',
            { type: 'flawless_victories', amount: 10 },
            { xp: 5000, unlock: 'SURVIVOR_TITLE' }
        ));
    }

    addSeasonalChallenges() {
        const season1Challenges = [
            new Challenge(
                'season1_victories',
                'Season 1 Victor',
                'Win 100 matches in Season 1',
                { type: 'seasonal_wins', season: 1, amount: 100 },
                { xp: 10000, unlock: 'SEASON1_WEAPON_SKIN' }
            ),
            new Challenge(
                'season1_mastery',
                'Season 1 Master',
                'Complete all Season 1 challenges',
                { type: 'season_completion', season: 1, amount: 1 },
                { xp: 20000, unlock: 'SEASON1_CHARACTER_SKIN' }
            )
        ];

        season1Challenges.forEach(challenge => this.seasonalChallenges.add(challenge));
    }

    addSecretChallenges() {
        this.addChallenge(new Challenge(
            'easter_egg_hunter',
            '???',
            'Find all hidden items in maps',
            { type: 'secrets_found', amount: 10 },
            { xp: 5000, unlock: 'MYSTERY_WEAPON' }
        ));
    }

    updateWeaponProgress(weaponId, eventType, amount) {
        const weaponChallenges = this.weaponChallenges.get(weaponId);
        if (!weaponChallenges) return;

        weaponChallenges.forEach(challenge => {
            if (challenge.requirements.type === eventType) {
                if (challenge.updateProgress(amount)) {
                    this.handleChallengeCompletion(challenge);
                }
            }
        });
    }

    checkMultikill(kills, timeWindow) {
        const multikillChallenge = this.challenges.get('multikill_master');
        if (kills >= multikillChallenge.requirements.amount && 
            timeWindow <= multikillChallenge.requirements.timeWindow) {
            this.updateProgress('multikill', { amount: 1 });
        }
    }

    checkFlawlessVictory(playerStats) {
        if (playerStats.deaths === 0 && playerStats.matchResult === 'victory') {
            this.updateProgress('flawless_victories', { amount: 1 });
        }
    }

    getWeaponProgress(weaponId) {
        const challenges = this.weaponChallenges.get(weaponId);
        if (!challenges) return null;

        return challenges.map(challenge => ({
            name: challenge.name,
            description: challenge.description,
            progress: challenge.progress,
            total: challenge.requirements.amount,
            completed: challenge.completed,
            reward: challenge.reward
        }));
    }

    getSeasonalProgress() {
        return Array.from(this.seasonalChallenges).map(challenge => ({
            name: challenge.name,
            description: challenge.description,
            progress: challenge.progress,
            total: challenge.requirements.amount,
            completed: challenge.completed,
            reward: challenge.reward
        }));
    }
} 