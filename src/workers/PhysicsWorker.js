class PhysicsWorker {
    constructor() {
        this.objects = new Map();
        this.gravity = -9.81;
        this.lastUpdate = performance.now();
        this.collisionGrid = new SpatialHashGrid(50); // 50 unit cell size
    }

    handleMessage(event) {
        const { type, data } = event.data;
        switch (type) {
            case 'init':
                this.init(data);
                break;
            case 'update':
                this.update(data.deltaTime);
                break;
            case 'addObject':
                this.addObject(data.object);
                break;
            case 'removeObject':
                this.removeObject(data.id);
                break;
            case 'updateObject':
                this.updateObject(data.id, data.updates);
                break;
        }
    }

    init(config) {
        this.gravity = config.gravity || -9.81;
        this.worldBounds = config.worldBounds;
    }

    update(deltaTime) {
        const now = performance.now();
        deltaTime = deltaTime || (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Update physics for all objects
        for (const [id, object] of this.objects) {
            if (!object.static) {
                this.updateObjectPhysics(object, deltaTime);
            }
        }

        // Check collisions
        this.checkCollisions();

        // Send updated states back to main thread
        this.postStateUpdate();
    }

    updateObjectPhysics(object, deltaTime) {
        // Apply gravity
        if (object.useGravity) {
            object.velocity.y += this.gravity * deltaTime;
        }

        // Update position
        object.position.x += object.velocity.x * deltaTime;
        object.position.y += object.velocity.y * deltaTime;
        object.position.z += object.velocity.z * deltaTime;

        // Apply world bounds
        this.applyWorldBounds(object);

        // Update spatial hash
        this.collisionGrid.updateObject(object);
    }

    checkCollisions() {
        const checked = new Set();

        for (const [id, object] of this.objects) {
            if (object.static) continue;

            const nearbyObjects = this.collisionGrid.getNearbyObjects(object);
            
            for (const other of nearbyObjects) {
                if (other.id === id) continue;
                
                const pairId = [id, other.id].sort().join(':');
                if (checked.has(pairId)) continue;
                
                checked.add(pairId);
                
                if (this.checkCollision(object, other)) {
                    this.resolveCollision(object, other);
                }
            }
        }
    }

    checkCollision(a, b) {
        // Simple sphere collision
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dz = b.position.z - a.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        return distance < (a.radius + b.radius);
    }

    resolveCollision(a, b) {
        // Calculate collision normal
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const dz = b.position.z - a.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;

        // Calculate relative velocity
        const rvx = b.velocity.x - a.velocity.x;
        const rvy = b.velocity.y - a.velocity.y;
        const rvz = b.velocity.z - a.velocity.z;

        // Calculate relative velocity in terms of the normal direction
        const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

        // Do not resolve if objects are moving apart
        if (velAlongNormal > 0) return;

        // Calculate restitution (bounciness)
        const restitution = Math.min(a.restitution, b.restitution);

        // Calculate impulse scalar
        const j = -(1 + restitution) * velAlongNormal;
        const impulse = j / ((a.static ? 0 : 1/a.mass) + (b.static ? 0 : 1/b.mass));

        // Apply impulse
        if (!a.static) {
            a.velocity.x -= impulse * nx / a.mass;
            a.velocity.y -= impulse * ny / a.mass;
            a.velocity.z -= impulse * nz / a.mass;
        }

        if (!b.static) {
            b.velocity.x += impulse * nx / b.mass;
            b.velocity.y += impulse * ny / b.mass;
            b.velocity.z += impulse * nz / b.mass;
        }
    }

    applyWorldBounds(object) {
        const { min, max } = this.worldBounds;
        
        // X bounds
        if (object.position.x - object.radius < min.x) {
            object.position.x = min.x + object.radius;
            object.velocity.x = Math.abs(object.velocity.x) * object.restitution;
        } else if (object.position.x + object.radius > max.x) {
            object.position.x = max.x - object.radius;
            object.velocity.x = -Math.abs(object.velocity.x) * object.restitution;
        }

        // Y bounds (ground)
        if (object.position.y - object.radius < min.y) {
            object.position.y = min.y + object.radius;
            object.velocity.y = Math.abs(object.velocity.y) * object.restitution;
            object.onGround = true;
        } else {
            object.onGround = false;
        }

        // Z bounds
        if (object.position.z - object.radius < min.z) {
            object.position.z = min.z + object.radius;
            object.velocity.z = Math.abs(object.velocity.z) * object.restitution;
        } else if (object.position.z + object.radius > max.z) {
            object.position.z = max.z - object.radius;
            object.velocity.z = -Math.abs(object.velocity.z) * object.restitution;
        }
    }

    postStateUpdate() {
        const states = {};
        for (const [id, object] of this.objects) {
            states[id] = {
                position: object.position,
                velocity: object.velocity,
                onGround: object.onGround
            };
        }
        self.postMessage({ type: 'state', data: states });
    }
}

// Initialize worker
const physicsWorker = new PhysicsWorker();
self.onmessage = (event) => physicsWorker.handleMessage(event); 