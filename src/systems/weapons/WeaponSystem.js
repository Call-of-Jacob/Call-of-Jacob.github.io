import { EventEmitter } from 'events';
import Logger from '../../utils/Logger';
import AudioManager from '../../audio/AudioManager';
import ParticleSystem from '../../systems/particle_system';

class Weapon {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.type = config.type;
        this.damage = config.damage;
        this.fireRate = config.fireRate;
        this.reloadTime = config.reloadTime;
        this.magazineSize = config.magazineSize;
        this.currentAmmo = config.magazineSize;
        this.totalAmmo = config.totalAmmo;
        this.range = config.range;
        this.spread = config.spread;
        this.recoil = config.recoil;
        this.model = null;
        this.animations = config.animations;
        this.sounds = config.sounds;
        this.lastFireTime = 0;
        this.isReloading = false;
        this.attachments = new Map();
    }

    canFire() {
        const now = performance.now();
        return !this.isReloading && 
               this.currentAmmo > 0 && 
               (now - this.lastFireTime) >= (1000 / this.fireRate);
    }

    fire(position, direction) {
        if (!this.canFire()) return false;

        this.currentAmmo--;
        this.lastFireTime = performance.now();

        // Play fire sound
        if (this.sounds.fire) {
            AudioManager.playSoundAtPosition(this.sounds.fire, position);
        }

        // Create muzzle flash
        this.createMuzzleFlash(position);

        // Apply spread
        const spreadDirection = this.calculateSpread(direction);

        // Return shot data
        return {
            position,
            direction: spreadDirection,
            damage: this.damage,
            range: this.range,
            weaponId: this.id
        };
    }

    reload() {
        if (this.isReloading || this.currentAmmo === this.magazineSize || this.totalAmmo <= 0) {
            return false;
        }

        this.isReloading = true;
        
        // Play reload sound
        if (this.sounds.reload) {
            AudioManager.playSoundAtPosition(this.sounds.reload, this.position);
        }

        setTimeout(() => {
            const ammoNeeded = this.magazineSize - this.currentAmmo;
            const ammoAvailable = Math.min(this.totalAmmo, ammoNeeded);
            
            this.currentAmmo += ammoAvailable;
            this.totalAmmo -= ammoAvailable;
            this.isReloading = false;
            
            this.emit('reloadComplete');
        }, this.reloadTime * 1000);

        return true;
    }

    calculateSpread(direction) {
        const angle = (Math.random() - 0.5) * this.spread;
        const spreadX = Math.cos(angle);
        const spreadY = Math.sin(angle);
        
        return {
            x: direction.x + spreadX * 0.1,
            y: direction.y + spreadY * 0.1,
            z: direction.z
        };
    }

    createMuzzleFlash(position) {
        ParticleSystem.createEmitter({
            position,
            count: 10,
            duration: 0.1,
            speed: 2,
            size: 0.2,
            color: '#ffff00',
            emissionRate: 100,
            texture: 'muzzleFlash'
        });
    }

    addAttachment(attachment) {
        if (this.attachments.has(attachment.slot)) {
            this.removeAttachment(attachment.slot);
        }
        this.attachments.set(attachment.slot, attachment);
        this.updateStats();
    }

    removeAttachment(slot) {
        if (this.attachments.has(slot)) {
            const attachment = this.attachments.get(slot);
            this.attachments.delete(slot);
            this.updateStats();
            return attachment;
        }
        return null;
    }

    updateStats() {
        // Reset to base stats
        this.damage = this.baseStats.damage;
        this.spread = this.baseStats.spread;
        this.recoil = this.baseStats.recoil;

        // Apply attachment modifiers
        for (const attachment of this.attachments.values()) {
            if (attachment.modifiers.damage) {
                this.damage *= attachment.modifiers.damage;
            }
            if (attachment.modifiers.spread) {
                this.spread *= attachment.modifiers.spread;
            }
            if (attachment.modifiers.recoil) {
                this.recoil *= attachment.modifiers.recoil;
            }
        }
    }
}

class WeaponSystem extends EventEmitter {
    constructor() {
        super();
        this.weapons = new Map();
        this.weaponTypes = {
            RIFLE: 'rifle',
            SMG: 'smg',
            PISTOL: 'pistol',
            SHOTGUN: 'shotgun',
            SNIPER: 'sniper'
        };
        this.attachmentSlots = {
            SCOPE: 'scope',
            BARREL: 'barrel',
            MAGAZINE: 'magazine',
            GRIP: 'grip'
        };
    }

    registerWeapon(config) {
        try {
            const weapon = new Weapon(config);
            this.weapons.set(config.id, weapon);
            Logger.info(`Registered weapon: ${config.name}`);
            return weapon;
        } catch (error) {
            Logger.error(`Failed to register weapon: ${config.name}`, error);
            return null;
        }
    }

    getWeapon(id) {
        return this.weapons.get(id);
    }

    createWeaponInstance(id) {
        const baseWeapon = this.weapons.get(id);
        if (!baseWeapon) {
            Logger.error(`Weapon not found: ${id}`);
            return null;
        }

        // Create a new instance with the same properties
        return new Weapon({
            ...baseWeapon,
            currentAmmo: baseWeapon.magazineSize,
            totalAmmo: baseWeapon.totalAmmo
        });
    }

    handleShot(shot) {
        this.emit('weaponFired', shot);
        return this.calculateDamage(shot);
    }

    calculateDamage(shot) {
        // Base damage calculation
        let damage = shot.damage;

        // Distance falloff
        const distance = this.calculateDistance(shot.position, shot.hitPosition);
        const falloff = Math.max(0, 1 - (distance / shot.range));
        damage *= falloff;

        // Hit location multiplier
        if (shot.hitLocation === 'head') {
            damage *= 2;
        } else if (shot.hitLocation === 'limb') {
            damage *= 0.7;
        }

        return Math.round(damage);
    }

    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

export default new WeaponSystem(); 