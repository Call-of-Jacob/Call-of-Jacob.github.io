import { EventEmitter } from 'events';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AuthSystem from '../../auth/AuthSystem';
import Logger from '../../utils/Logger';

class WeaponCustomization extends EventEmitter {
    constructor() {
        super();
        this.weapons = new Map();
        this.attachments = new Map();
        this.skins = new Map();
        this.playerLoadouts = new Map();
        this.maxLoadouts = 10;
        this.initialized = false;
    }

    async init() {
        try {
            await this.loadWeaponData();
            await this.loadPlayerLoadouts();
            this.initialized = true;
            Logger.info('Weapon customization system initialized');
        } catch (error) {
            Logger.error('Failed to initialize weapon customization:', error);
            throw error;
        }
    }

    async loadWeaponData() {
        // Load weapon definitions
        const weapons = {
            m1_garand: {
                id: 'm1_garand',
                name: 'M1 Garand',
                type: 'rifle',
                damage: 80,
                fireRate: 300,
                recoil: 0.7,
                accuracy: 0.85,
                range: 100,
                magazineSize: 8,
                attachmentSlots: ['scope', 'barrel', 'stock'],
                unlockLevel: 1
            },
            thompson: {
                id: 'thompson',
                name: 'Thompson',
                type: 'smg',
                damage: 45,
                fireRate: 700,
                recoil: 0.5,
                accuracy: 0.7,
                range: 50,
                magazineSize: 30,
                attachmentSlots: ['sight', 'barrel', 'grip', 'stock'],
                unlockLevel: 5
            }
            // Add more weapons
        };

        // Load attachment definitions
        const attachments = {
            scope_4x: {
                id: 'scope_4x',
                name: '4x Scope',
                type: 'scope',
                stats: {
                    accuracy: 0.2,
                    range: 30,
                    adsSpeed: -0.1
                },
                compatibleWeapons: ['m1_garand']
            },
            compensator: {
                id: 'compensator',
                name: 'Compensator',
                type: 'barrel',
                stats: {
                    recoil: -0.15,
                    accuracy: 0.1
                },
                compatibleWeapons: ['m1_garand', 'thompson']
            }
            // Add more attachments
        };

        // Load skin definitions
        const skins = {
            vintage: {
                id: 'vintage',
                name: 'Vintage',
                rarity: 'common',
                texture: 'vintage_camo.png'
            },
            gold: {
                id: 'gold',
                name: 'Gold',
                rarity: 'legendary',
                texture: 'gold_plated.png'
            }
            // Add more skins
        };

        weapons.forEach(weapon => this.weapons.set(weapon.id, weapon));
        attachments.forEach(attachment => this.attachments.set(attachment.id, attachment));
        skins.forEach(skin => this.skins.set(skin.id, skin));
    }

    async loadPlayerLoadouts() {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return;

        try {
            const userProfile = await AuthSystem.getUserProfile(userId);
            userProfile.loadouts?.forEach(loadout => {
                this.playerLoadouts.set(loadout.id, loadout);
            });
        } catch (error) {
            Logger.error('Failed to load player loadouts:', error);
        }
    }

    async createLoadout(name) {
        if (this.playerLoadouts.size >= this.maxLoadouts) {
            throw new Error('Maximum loadout limit reached');
        }

        const loadout = {
            id: Date.now().toString(),
            name,
            primary: null,
            secondary: null,
            equipment: {
                lethal: null,
                tactical: null
            }
        };

        this.playerLoadouts.set(loadout.id, loadout);
        await this.saveLoadouts();

        this.emit('loadoutCreated', loadout);
        return loadout;
    }

    async updateLoadout(loadoutId, updates) {
        const loadout = this.playerLoadouts.get(loadoutId);
        if (!loadout) throw new Error('Loadout not found');

        // Validate updates
        if (updates.primary && !this.validateWeaponConfig(updates.primary)) {
            throw new Error('Invalid primary weapon configuration');
        }
        if (updates.secondary && !this.validateWeaponConfig(updates.secondary)) {
            throw new Error('Invalid secondary weapon configuration');
        }

        Object.assign(loadout, updates);
        await this.saveLoadouts();

        this.emit('loadoutUpdated', loadout);
        return loadout;
    }

    validateWeaponConfig(config) {
        const weapon = this.weapons.get(config.weaponId);
        if (!weapon) return false;

        // Check attachments
        if (config.attachments) {
            for (const [slot, attachmentId] of Object.entries(config.attachments)) {
                const attachment = this.attachments.get(attachmentId);
                if (!attachment) return false;
                if (!weapon.attachmentSlots.includes(slot)) return false;
                if (!attachment.compatibleWeapons.includes(config.weaponId)) return false;
            }
        }

        // Check skin
        if (config.skin) {
            const skin = this.skins.get(config.skin);
            if (!skin) return false;
        }

        return true;
    }

    async deleteLoadout(loadoutId) {
        if (!this.playerLoadouts.has(loadoutId)) {
            throw new Error('Loadout not found');
        }

        this.playerLoadouts.delete(loadoutId);
        await this.saveLoadouts();

        this.emit('loadoutDeleted', loadoutId);
    }

    async saveLoadouts() {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) return;

        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                loadouts: Array.from(this.playerLoadouts.values())
            });
        } catch (error) {
            Logger.error('Failed to save loadouts:', error);
            throw error;
        }
    }

    getWeaponStats(weaponId, attachments = {}) {
        const weapon = this.weapons.get(weaponId);
        if (!weapon) return null;

        const stats = { ...weapon };
        
        // Apply attachment modifiers
        Object.values(attachments).forEach(attachmentId => {
            const attachment = this.attachments.get(attachmentId);
            if (attachment) {
                Object.entries(attachment.stats).forEach(([stat, modifier]) => {
                    if (stats[stat] !== undefined) {
                        stats[stat] += modifier;
                    }
                });
            }
        });

        // Clamp values
        stats.accuracy = Math.max(0, Math.min(1, stats.accuracy));
        stats.recoil = Math.max(0, Math.min(1, stats.recoil));

        return stats;
    }

    getCompatibleAttachments(weaponId) {
        const weapon = this.weapons.get(weaponId);
        if (!weapon) return new Map();

        const compatible = new Map();
        this.attachments.forEach(attachment => {
            if (attachment.compatibleWeapons.includes(weaponId)) {
                compatible.set(attachment.id, attachment);
            }
        });

        return compatible;
    }

    getLoadout(loadoutId) {
        return this.playerLoadouts.get(loadoutId);
    }

    getAllLoadouts() {
        return Array.from(this.playerLoadouts.values());
    }

    dispose() {
        this.weapons.clear();
        this.attachments.clear();
        this.skins.clear();
        this.playerLoadouts.clear();
        this.removeAllListeners();
        this.initialized = false;
    }
}

export default new WeaponCustomization(); 