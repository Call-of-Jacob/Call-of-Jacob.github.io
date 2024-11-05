import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import AuthSystem from '../../auth/AuthSystem';
import Logger from '../../utils/Logger';

class SaveSystem {
    constructor() {
        this.autoSaveInterval = 5 * 60 * 1000; // 5 minutes
        this.autoSaveTimer = null;
        this.lastSaveTime = 0;
        this.pendingChanges = new Map();
        this.initialized = false;
    }

    async init() {
        try {
            if (AuthSystem.isAuthenticated()) {
                await this.loadPlayerData();
                this.startAutoSave();
            }
            this.initialized = true;
            Logger.info('Save system initialized');
        } catch (error) {
            Logger.error('Failed to initialize save system:', error);
            throw error;
        }
    }

    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            if (this.pendingChanges.size > 0) {
                this.saveGame().catch(error => {
                    Logger.error('Auto-save failed:', error);
                });
            }
        }, this.autoSaveInterval);
    }

    async loadPlayerData() {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) throw new Error('User not authenticated');

        try {
            const docRef = doc(db, 'playerData', userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return this.decryptSaveData(docSnap.data());
            } else {
                return this.createInitialSaveData();
            }
        } catch (error) {
            Logger.error('Failed to load player data:', error);
            throw error;
        }
    }

    async saveGame(force = false) {
        const userId = AuthSystem.getCurrentUser()?.uid;
        if (!userId) throw new Error('User not authenticated');

        // Check if enough time has passed since last save
        const now = Date.now();
        if (!force && now - this.lastSaveTime < 60000) { // 1 minute minimum between saves
            return false;
        }

        try {
            const saveData = this.prepareSaveData();
            const encryptedData = this.encryptSaveData(saveData);
            
            const docRef = doc(db, 'playerData', userId);
            await setDoc(docRef, encryptedData, { merge: true });

            this.lastSaveTime = now;
            this.pendingChanges.clear();

            Logger.info('Game saved successfully');
            return true;
        } catch (error) {
            Logger.error('Failed to save game:', error);
            throw error;
        }
    }

    queueChange(category, data) {
        if (!this.pendingChanges.has(category)) {
            this.pendingChanges.set(category, new Set());
        }
        this.pendingChanges.get(category).add(data);
    }

    prepareSaveData() {
        const saveData = {
            lastSaved: Date.now(),
            version: '1.0.0',
            player: {
                stats: {},
                inventory: {},
                loadouts: [],
                achievements: [],
                settings: {}
            },
            gameState: {
                progression: {},
                unlocks: {},
                challenges: {}
            }
        };

        // Process pending changes
        for (const [category, changes] of this.pendingChanges) {
            switch (category) {
                case 'stats':
                    this.processStatsChanges(saveData, changes);
                    break;
                case 'inventory':
                    this.processInventoryChanges(saveData, changes);
                    break;
                case 'loadouts':
                    this.processLoadoutChanges(saveData, changes);
                    break;
                case 'achievements':
                    this.processAchievementChanges(saveData, changes);
                    break;
                default:
                    Logger.warn(`Unknown save category: ${category}`);
            }
        }

        return saveData;
    }

    processStatsChanges(saveData, changes) {
        for (const stat of changes) {
            saveData.player.stats[stat.name] = stat.value;
        }
    }

    processInventoryChanges(saveData, changes) {
        for (const item of changes) {
            if (!saveData.player.inventory[item.type]) {
                saveData.player.inventory[item.type] = [];
            }
            saveData.player.inventory[item.type].push(item);
        }
    }

    processLoadoutChanges(saveData, changes) {
        for (const loadout of changes) {
            const existingIndex = saveData.player.loadouts.findIndex(l => l.id === loadout.id);
            if (existingIndex >= 0) {
                saveData.player.loadouts[existingIndex] = loadout;
            } else {
                saveData.player.loadouts.push(loadout);
            }
        }
    }

    processAchievementChanges(saveData, changes) {
        for (const achievement of changes) {
            saveData.player.achievements.push({
                id: achievement.id,
                unlockedAt: achievement.unlockedAt || Date.now()
            });
        }
    }

    encryptSaveData(data) {
        // In a real implementation, you'd want to encrypt sensitive data
        // For now, we'll just return the data as-is
        return data;
    }

    decryptSaveData(data) {
        // In a real implementation, you'd want to decrypt sensitive data
        // For now, we'll just return the data as-is
        return data;
    }

    createInitialSaveData() {
        return {
            lastSaved: Date.now(),
            version: '1.0.0',
            player: {
                stats: {
                    level: 1,
                    xp: 0,
                    kills: 0,
                    deaths: 0,
                    wins: 0,
                    losses: 0
                },
                inventory: {},
                loadouts: [{
                    id: 'default',
                    name: 'Default Loadout',
                    primary: null,
                    secondary: null,
                    perks: [],
                    equipment: {}
                }],
                achievements: [],
                settings: {
                    sensitivity: 1,
                    volume: {
                        master: 1,
                        sfx: 1,
                        music: 0.7
                    }
                }
            },
            gameState: {
                progression: {
                    rank: 1,
                    prestige: 0
                },
                unlocks: {
                    weapons: ['starter_rifle'],
                    attachments: [],
                    perks: ['starter_perk']
                },
                challenges: {}
            }
        };
    }

    async exportSave() {
        try {
            const saveData = await this.loadPlayerData();
            const blob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `call_of_jacob_save_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            Logger.error('Failed to export save:', error);
            throw error;
        }
    }

    async importSave(file) {
        try {
            const text = await file.text();
            const saveData = JSON.parse(text);
            
            // Validate save data
            if (!this.validateSaveData(saveData)) {
                throw new Error('Invalid save data');
            }

            // Import the save
            const userId = AuthSystem.getCurrentUser()?.uid;
            if (!userId) throw new Error('User not authenticated');

            const docRef = doc(db, 'playerData', userId);
            await setDoc(docRef, saveData);

            Logger.info('Save imported successfully');
            return true;
        } catch (error) {
            Logger.error('Failed to import save:', error);
            throw error;
        }
    }

    validateSaveData(data) {
        // Add validation logic here
        return true;
    }

    dispose() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        this.pendingChanges.clear();
        this.initialized = false;
    }
}

export default new SaveSystem(); 