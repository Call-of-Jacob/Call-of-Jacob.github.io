class WeaponAttachment {
    constructor(type, stats, requirements) {
        this.type = type;
        this.stats = stats;
        this.requirements = requirements;
    }

    applyToWeapon(weapon) {
        Object.entries(this.stats).forEach(([stat, modifier]) => {
            if (typeof modifier === 'number') {
                weapon[stat] *= (1 + modifier);
            } else if (typeof modifier === 'object') {
                weapon[stat] = { ...weapon[stat], ...modifier };
            }
        });
    }
}

class Perk {
    constructor(name, effects, maxLevel = 3) {
        this.name = name;
        this.effects = effects;
        this.maxLevel = maxLevel;
        this.currentLevel = 0;
    }

    upgrade() {
        if (this.currentLevel < this.maxLevel) {
            this.currentLevel++;
            return true;
        }
        return false;
    }

    getEffect(effectName) {
        const effect = this.effects[effectName];
        return effect * this.currentLevel;
    }
}

class ProgressionSystem {
    constructor() {
        this.attachments = this.initializeAttachments();
        this.perks = this.initializePerks();
        this.playerProgress = {
            level: 1,
            experience: 0,
            unlockedAttachments: new Set(),
            unlockedPerks: new Set(),
            activePerks: new Map()
        };
    }

    initializeAttachments() {
        return {
            SCOPE_4X: new WeaponAttachment('scope', {
                accuracy: 0.2,
                range: 0.3,
                aimSpeed: -0.1
            }, { playerLevel: 5 }),

            SUPPRESSOR: new WeaponAttachment('barrel', {
                noise: -0.7,
                damage: -0.1,
                range: -0.15
            }, { playerLevel: 8 }),

            EXTENDED_MAG: new WeaponAttachment('magazine', {
                magSize: 0.5,
                reloadSpeed: -0.1
            }, { playerLevel: 3 }),

            GRIP: new WeaponAttachment('underbarrel', {
                recoil: -0.2,
                mobility: -0.05
            }, { playerLevel: 4 })
        };
    }

    initializePerks() {
        return {
            QUICK_HANDS: new Perk('Quick Hands', {
                reloadSpeed: 0.1,
                weaponSwapSpeed: 0.1
            }),

            MARATHON: new Perk('Marathon', {
                sprintDuration: 0.2,
                sprintSpeed: 0.05
            }),

            STEALTH: new Perk('Stealth', {
                movementNoise: -0.2,
                detectionRadius: -0.15
            }),

            SCAVENGER: new Perk('Scavenger', {
                ammoPickup: 0.25,
                itemDropRate: 0.1
            })
        };
    }

    addExperience(amount) {
        this.playerProgress.experience += amount;
        
        // Check for level up
        const newLevel = this.calculateLevel(this.playerProgress.experience);
        if (newLevel > this.playerProgress.level) {
            this.levelUp(newLevel);
        }
    }

    calculateLevel(experience) {
        // Simple level calculation: each level requires 1000 * level XP
        return Math.floor(Math.sqrt(experience / 1000)) + 1;
    }

    levelUp(newLevel) {
        const oldLevel = this.playerProgress.level;
        this.playerProgress.level = newLevel;

        // Check for new unlocks
        this.checkUnlocks(oldLevel, newLevel);

        // Trigger level up event
        const event = new CustomEvent('levelUp', {
            detail: { oldLevel, newLevel }
        });
        document.dispatchEvent(event);
    }

    checkUnlocks(oldLevel, newLevel) {
        // Check attachments
        Object.entries(this.attachments).forEach(([id, attachment]) => {
            if (attachment.requirements.playerLevel <= newLevel) {
                this.playerProgress.unlockedAttachments.add(id);
            }
        });

        // Check perks
        Object.entries(this.perks).forEach(([id, perk]) => {
            if (this.getPerkUnlockLevel(id) <= newLevel) {
                this.playerProgress.unlockedPerks.add(id);
            }
        });
    }

    getPerkUnlockLevel(perkId) {
        // Define unlock levels for perks
        const unlockLevels = {
            QUICK_HANDS: 2,
            MARATHON: 4,
            STEALTH: 6,
            SCAVENGER: 8
        };
        return unlockLevels[perkId] || 1;
    }

    equipAttachment(weaponId, attachmentId, slot) {
        if (!this.playerProgress.unlockedAttachments.has(attachmentId)) {
            return false;
        }

        const weapon = gameState.gameData.player.weapons.get(weaponId);
        const attachment = this.attachments[attachmentId];

        if (weapon && attachment) {
            weapon.attachments[slot] = attachment;
            attachment.applyToWeapon(weapon);
            return true;
        }
        return false;
    }

    activatePerk(perkId) {
        if (!this.playerProgress.unlockedPerks.has(perkId)) {
            return false;
        }

        const perk = this.perks[perkId];
        if (this.playerProgress.activePerks.size < 3) {
            this.playerProgress.activePerks.set(perkId, perk);
            return true;
        }
        return false;
    }

    deactivatePerk(perkId) {
        return this.playerProgress.activePerks.delete(perkId);
    }

    getActivePerks() {
        return Array.from(this.playerProgress.activePerks.values());
    }
} 