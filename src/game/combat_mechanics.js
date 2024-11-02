class CombatSystem {
    constructor() {
        this.grenadeTypes = {
            FRAG: {
                damage: 100,
                radius: 5,
                fuseTime: 3,
                throwForce: 20
            },
            SMOKE: {
                radius: 8,
                duration: 15,
                throwForce: 15
            },
            STUN: {
                radius: 6,
                duration: 5,
                throwForce: 18
            }
        };

        this.meleeWeapons = {
            KNIFE: {
                damage: 45,
                range: 1.5,
                attackSpeed: 1.2,
                animations: ['slash', 'stab']
            },
            BAYONET: {
                damage: 55,
                range: 2,
                attackSpeed: 1,
                animations: ['thrust', 'slash']
            }
        };

        this.activeGrenades = new Set();
        this.explosionParticles = new ParticleSystem();
        this.smokeParticles = new ParticleSystem();
    }

    throwGrenade(type, position, direction, thrower) {
        const grenadeConfig = this.grenadeTypes[type];
        if (!grenadeConfig) return;

        const grenade = {
            type,
            position: { ...position },
            velocity: {
                x: direction.x * grenadeConfig.throwForce,
                y: direction.y * grenadeConfig.throwForce + 5, // Add upward arc
                z: direction.z * grenadeConfig.throwForce
            },
            fuseTime: grenadeConfig.fuseTime,
            thrower,
            active: true
        };

        this.activeGrenades.add(grenade);
        return grenade;
    }

    updateGrenades(deltaTime) {
        for (const grenade of this.activeGrenades) {
            if (!grenade.active) continue;

            // Update position with physics
            grenade.velocity.y -= 9.81 * deltaTime; // Gravity
            grenade.position.x += grenade.velocity.x * deltaTime;
            grenade.position.y += grenade.velocity.y * deltaTime;
            grenade.position.z += grenade.velocity.z * deltaTime;

            // Check ground collision
            if (grenade.position.y <= 0) {
                grenade.position.y = 0;
                grenade.velocity.y = -grenade.velocity.y * 0.3; // Bounce
                grenade.velocity.x *= 0.7; // Friction
                grenade.velocity.z *= 0.7;
            }

            // Update fuse timer
            grenade.fuseTime -= deltaTime;
            if (grenade.fuseTime <= 0) {
                this.detonateGrenade(grenade);
            }
        }
    }

    detonateGrenade(grenade) {
        const config = this.grenadeTypes[grenade.type];
        
        switch (grenade.type) {
            case 'FRAG':
                this.createExplosion(grenade.position, config);
                break;
            case 'SMOKE':
                this.createSmokeCloud(grenade.position, config);
                break;
            case 'STUN':
                this.createStunEffect(grenade.position, config);
                break;
        }

        this.activeGrenades.delete(grenade);
    }

    createExplosion(position, config) {
        // Damage calculation
        const entities = this.getEntitiesInRadius(position, config.radius);
        for (const entity of entities) {
            const distance = this.calculateDistance(position, entity.position);
            const damage = this.calculateExplosionDamage(distance, config);
            entity.takeDamage(damage);
        }

        // Visual effects
        this.explosionParticles.emit({
            position,
            count: 50,
            speed: 10,
            size: 0.5,
            duration: 1,
            color: '#ff6600'
        });

        // Sound effect
        soundManager.playSound('explosion', position);
    }

    createSmokeCloud(position, config) {
        const smokeEffect = {
            position,
            radius: config.radius,
            duration: config.duration,
            currentTime: 0
        };

        this.smokeParticles.emit({
            position,
            count: 200,
            speed: 2,
            size: 1,
            duration: config.duration,
            color: '#888888',
            continuous: true
        });
    }

    performMeleeAttack(attacker, weaponType) {
        const weapon = this.meleeWeapons[weaponType];
        if (!weapon) return;

        const attackDirection = attacker.getForwardVector();
        const hitbox = this.createMeleeHitbox(attacker.position, attackDirection, weapon.range);
        const targets = this.getEntitiesInHitbox(hitbox);

        // Play animation
        const animationName = weapon.animations[Math.floor(Math.random() * weapon.animations.length)];
        animationSystem.playMeleeAnimation(attacker.id, animationName);

        // Apply damage
        for (const target of targets) {
            target.takeDamage(weapon.damage);
            this.createBloodEffect(target.position);
        }

        // Sound effect
        soundManager.playSound('melee_swing', attacker.position);
        if (targets.length > 0) {
            soundManager.playSound('melee_hit', targets[0].position);
        }
    }

    calculateExplosionDamage(distance, config) {
        const falloff = 1 - (distance / config.radius);
        return Math.max(0, config.damage * falloff);
    }

    getEntitiesInRadius(position, radius) {
        // Implementation would depend on your spatial partitioning system
        return gameState.getEntitiesInRange(position, radius);
    }

    createMeleeHitbox(position, direction, range) {
        // Create a cone-shaped hitbox for melee attacks
        return {
            position,
            direction,
            range,
            angle: Math.PI / 4 // 45-degree cone
        };
    }

    getEntitiesInHitbox(hitbox) {
        // Implementation would depend on your collision detection system
        return gameState.getEntitiesInHitbox(hitbox);
    }

    createBloodEffect(position) {
        particleSystem.emit({
            position,
            count: 20,
            speed: 5,
            size: 0.1,
            duration: 0.5,
            color: '#ff0000'
        });
    }
} 