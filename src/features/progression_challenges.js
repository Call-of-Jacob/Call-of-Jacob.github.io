class Challenge {
    constructor(id, name, description, requirements, reward) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.requirements = requirements;
        this.reward = reward;
        this.progress = 0;
        this.completed = false;
    }

    updateProgress(amount) {
        if (this.completed) return false;
        
        this.progress = Math.min(this.progress + amount, this.requirements.amount);
        
        if (this.progress >= this.requirements.amount) {
            this.completed = true;
            return true;
        }
        return false;
    }

    getProgressPercentage() {
        return (this.progress / this.requirements.amount) * 100;
    }
}

class ChallengeSystem {
    constructor(progressionSystem) {
        this.progression = progressionSystem;
        this.challenges = new Map();
        this.dailyChallenges = new Set();
        this.weeklyChallenges = new Set();
        this.achievements = new Map();
        
        this.initializeChallenges();
        this.initializeAchievements();
    }

    initializeChallenges() {
        // Weapon Mastery Challenges
        this.addChallenge(new Challenge(
            'headshot_master',
            'Headshot Master',
            'Get 100 headshot kills',
            { type: 'headshots', amount: 100 },
            { xp: 5000, unlock: 'SCOPE_4X' }
        ));

        // Daily Challenges
        this.addDailyChallenge(new Challenge(
            'daily_kills',
            'Daily Warrior',
            'Get 50 kills in one day',
            { type: 'kills', amount: 50 },
            { xp: 1000 }
        ));

        // Weekly Challenges
        this.addWeeklyChallenge(new Challenge(
            'weekly_wins',
            'Victory Week',
            'Win 20 matches this week',
            { type: 'wins', amount: 20 },
            { xp: 5000, unlock: 'WEAPON_SKIN' }
        ));
    }

    initializeAchievements() {
        this.achievements.set('first_blood', {
            name: 'First Blood',
            description: 'Get the first kill in a match',
            icon: 'first_blood.png',
            unlocked: false
        });

        this.achievements.set('unstoppable', {
            name: 'Unstoppable',
            description: 'Get a 10 kill streak',
            icon: 'unstoppable.png',
            unlocked: false
        });
    }

    addChallenge(challenge) {
        this.challenges.set(challenge.id, challenge);
    }

    addDailyChallenge(challenge) {
        this.dailyChallenges.add(challenge);
    }

    addWeeklyChallenge(challenge) {
        this.weeklyChallenges.add(challenge);
    }

    updateProgress(eventType, data) {
        let updatedChallenges = [];

        // Update regular challenges
        this.challenges.forEach(challenge => {
            if (challenge.requirements.type === eventType) {
                if (challenge.updateProgress(data.amount)) {
                    updatedChallenges.push(challenge);
                }
            }
        });

        // Update daily/weekly challenges
        [this.dailyChallenges, this.weeklyChallenges].forEach(challengeSet => {
            challengeSet.forEach(challenge => {
                if (challenge.requirements.type === eventType) {
                    if (challenge.updateProgress(data.amount)) {
                        updatedChallenges.push(challenge);
                    }
                }
            });
        });

        // Handle completed challenges
        updatedChallenges.forEach(challenge => {
            this.handleChallengeCompletion(challenge);
        });
    }

    handleChallengeCompletion(challenge) {
        // Award XP
        if (challenge.reward.xp) {
            this.progression.addExperience(challenge.reward.xp);
        }

        // Unlock rewards
        if (challenge.reward.unlock) {
            this.progression.unlockReward(challenge.reward.unlock);
        }

        // Show notification
        this.showChallengeNotification(challenge);
    }

    showChallengeNotification(challenge) {
        const notification = document.createElement('div');
        notification.className = 'challenge-notification';
        notification.innerHTML = `
            <h3>Challenge Completed!</h3>
            <p>${challenge.name}</p>
            <div class="reward-info">
                <span>+${challenge.reward.xp} XP</span>
                ${challenge.reward.unlock ? 
                    `<span>Unlocked: ${challenge.reward.unlock}</span>` : ''}
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    unlockAchievement(achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (achievement && !achievement.unlocked) {
            achievement.unlocked = true;
            this.showAchievementNotification(achievement);
            this.saveAchievements();
        }
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <img src="assets/achievements/${achievement.icon}" alt="${achievement.name}">
            <div class="achievement-info">
                <h3>Achievement Unlocked!</h3>
                <p>${achievement.name}</p>
                <p>${achievement.description}</p>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    saveAchievements() {
        const achievementData = Array.from(this.achievements.entries())
            .reduce((acc, [id, achievement]) => {
                acc[id] = achievement.unlocked;
                return acc;
            }, {});
            
        localStorage.setItem('achievements', JSON.stringify(achievementData));
    }

    loadAchievements() {
        const savedData = localStorage.getItem('achievements');
        if (savedData) {
            const achievementData = JSON.parse(savedData);
            Object.entries(achievementData).forEach(([id, unlocked]) => {
                if (this.achievements.has(id)) {
                    this.achievements.get(id).unlocked = unlocked;
                }
            });
        }
    }
} 