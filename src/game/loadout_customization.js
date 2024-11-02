class WeaponCustomization {
    constructor() {
        this.variants = this.initializeVariants();
        this.skins = this.initializeSkins();
        this.charms = this.initializeCharms();
        this.stickers = this.initializeStickers();
    }

    initializeVariants() {
        return {
            M1_GARAND: {
                STANDARD: {
                    name: "Standard Issue",
                    stats: { base: true },
                    unlocked: true
                },
                SNIPER: {
                    name: "Sniper Variant",
                    stats: {
                        accuracy: 1.2,
                        range: 1.3,
                        mobility: 0.8
                    },
                    requirements: { kills: 500 }
                },
                TACTICAL: {
                    name: "Tactical Variant",
                    stats: {
                        mobility: 1.2,
                        reloadSpeed: 1.1,
                        accuracy: 0.9
                    },
                    requirements: { headshots: 100 }
                }
            },
            THOMPSON: {
                STANDARD: {
                    name: "Standard Issue",
                    stats: { base: true },
                    unlocked: true
                },
                COMMANDO: {
                    name: "Commando Variant",
                    stats: {
                        recoil: 0.8,
                        mobility: 1.1,
                        magSize: 1.2
                    },
                    requirements: { kills: 400 }
                }
            }
        };
    }

    initializeSkins() {
        return {
            STANDARD: {
                name: "Standard",
                rarity: "Common",
                unlocked: true
            },
            BATTLE_WORN: {
                name: "Battle Worn",
                rarity: "Uncommon",
                requirements: { matches: 50 }
            },
            GOLD: {
                name: "Gold Plated",
                rarity: "Legendary",
                requirements: { weaponMastery: true }
            },
            WINTER_CAMO: {
                name: "Winter Camo",
                rarity: "Rare",
                requirements: { seasonalChallenge: "winter_warrior" }
            }
        };
    }

    initializeCharms() {
        return {
            DOG_TAGS: {
                name: "Dog Tags",
                rarity: "Common",
                unlocked: true
            },
            LUCKY_DICE: {
                name: "Lucky Dice",
                rarity: "Rare",
                requirements: { headshots: 250 }
            }
        };
    }

    initializeStickers() {
        return {
            DIVISION_PATCH: {
                name: "Division Patch",
                rarity: "Common",
                unlocked: true
            },
            VICTORY_MARK: {
                name: "Victory Mark",
                rarity: "Rare",
                requirements: { wins: 100 }
            }
        };
    }

    applyVariant(weapon, variantId) {
        const variant = this.variants[weapon.id]?.[variantId];
        if (!variant || !variant.unlocked) return false;

        Object.entries(variant.stats).forEach(([stat, modifier]) => {
            if (stat !== 'base') {
                weapon.stats[stat] *= modifier;
            }
        });

        weapon.variant = variantId;
        return true;
    }

    applySkin(weapon, skinId) {
        const skin = this.skins[skinId];
        if (!skin || !skin.unlocked) return false;

        weapon.skin = skinId;
        return true;
    }

    applyCharm(weapon, charmId) {
        const charm = this.charms[charmId];
        if (!charm || !charm.unlocked) return false;

        weapon.charm = charmId;
        return true;
    }

    applySticker(weapon, stickerId, position) {
        const sticker = this.stickers[stickerId];
        if (!sticker || !sticker.unlocked) return false;

        if (!weapon.stickers) weapon.stickers = {};
        weapon.stickers[position] = stickerId;
        return true;
    }

    getUnlockedCustomizations(weaponId) {
        return {
            variants: Object.entries(this.variants[weaponId] || {})
                .filter(([_, variant]) => variant.unlocked)
                .map(([id, variant]) => ({id, ...variant})),
            skins: Object.entries(this.skins)
                .filter(([_, skin]) => skin.unlocked)
                .map(([id, skin]) => ({id, ...skin})),
            charms: Object.entries(this.charms)
                .filter(([_, charm]) => charm.unlocked)
                .map(([id, charm]) => ({id, ...charm})),
            stickers: Object.entries(this.stickers)
                .filter(([_, sticker]) => sticker.unlocked)
                .map(([id, sticker]) => ({id, ...sticker}))
        };
    }
} 