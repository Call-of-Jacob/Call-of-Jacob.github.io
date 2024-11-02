class PhysicsSystem {
    constructor() {
        this.gravity = -9.81;
        this.objects = new Map();
        this.colliders = new Map();
        this.spatialHash = new SpatialHashGrid(50);
        this.timestep = 1/60;
        this.maxSubSteps = 3;
    }

    addObject(id, object, collider) {
        this.objects.set(id, object);
        if (collider) {
            this.colliders.set(id, collider);
            this.spatialHash.insert(object);
        }
    }

    removeObject(id) {
        const object = this.objects.get(id);
        if (object) {
            this.spatialHash.remove(object);
            this.objects.delete(id);
            this.colliders.delete(id);
        }
    }

    update(deltaTime) {
        const numSubSteps = Math.min(Math.floor(deltaTime / this.timestep), this.maxSubSteps);
        const subDelta = deltaTime / numSubSteps;

        for (let step = 0; step < numSubSteps; step++) {
            this.simulateStep(subDelta);
        }
    }

    simulateStep(deltaTime) {
        // Apply forces
        for (const object of this.objects.values()) {
            if (!object.static) {
                // Apply gravity
                object.velocity.y += this.gravity * deltaTime;

                // Apply velocity
                object.position.x += object.velocity.x * deltaTime;
                object.position.y += object.velocity.y * deltaTime;
                object.position.z += object.velocity.z * deltaTime;

                // Apply damping
                object.velocity.x *= 0.99;
                object.velocity.z *= 0.99;
            }
        }

        // Check collisions
        this.checkCollisions();
    }

    checkCollisions() {
        const checked = new Set();

        for (const [id, object] of this.objects) {
            if (object.static) continue;

            const nearbyObjects = this.spatialHash.getNearbyObjects(object.position);
            const collider = this.colliders.get(id);

            for (const other of nearbyObjects) {
                const otherId = other.id;
                const pairId = [id, otherId].sort().join('-');

                if (checked.has(pairId) || id === otherId) continue;
                checked.add(pairId);

                const otherCollider = this.colliders.get(otherId);
                if (!otherCollider) continue;

                const collision = this.detectCollision(collider, otherCollider);
                if (collision) {
                    this.resolveCollision(object, other, collision);
                }
            }
        }
    }

    detectCollision(colliderA, colliderB) {
        // Simple sphere collision for now
        const dx = colliderA.position.x - colliderB.position.x;
        const dy = colliderA.position.y - colliderB.position.y;
        const dz = colliderA.position.z - colliderB.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDistance = colliderA.radius + colliderB.radius;

        if (distance < minDistance) {
            return {
                normal: {
                    x: dx / distance,
                    y: dy / distance,
                    z: dz / distance
                },
                depth: minDistance - distance
            };
        }

        return null;
    }

    resolveCollision(objectA, objectB, collision) {
        if (objectB.static) {
            // Move object A out of collision
            objectA.position.x += collision.normal.x * collision.depth;
            objectA.position.y += collision.normal.y * collision.depth;
            objectA.position.z += collision.normal.z * collision.depth;

            // Reflect velocity
            const dot = this.dotProduct(objectA.velocity, collision.normal);
            objectA.velocity.x = objectA.velocity.x - 2 * dot * collision.normal.x;
            objectA.velocity.y = objectA.velocity.y - 2 * dot * collision.normal.y;
            objectA.velocity.z = objectA.velocity.z - 2 * dot * collision.normal.z;

            // Apply restitution
            objectA.velocity.x *= objectA.restitution;
            objectA.velocity.y *= objectA.restitution;
            objectA.velocity.z *= objectA.restitution;
        } else {
            // Calculate impulse for both objects
            const relativeVelocity = {
                x: objectA.velocity.x - objectB.velocity.x,
                y: objectA.velocity.y - objectB.velocity.y,
                z: objectA.velocity.z - objectB.velocity.z
            };

            const velocityAlongNormal = this.dotProduct(relativeVelocity, collision.normal);
            if (velocityAlongNormal > 0) return;

            const restitution = Math.min(objectA.restitution, objectB.restitution);
            const j = -(1 + restitution) * velocityAlongNormal;
            const impulse = {
                x: collision.normal.x * j,
                y: collision.normal.y * j,
                z: collision.normal.z * j
            };

            // Apply impulse
            objectA.velocity.x += impulse.x / objectA.mass;
            objectA.velocity.y += impulse.y / objectA.mass;
            objectA.velocity.z += impulse.z / objectA.mass;

            objectB.velocity.x -= impulse.x / objectB.mass;
            objectB.velocity.y -= impulse.y / objectB.mass;
            objectB.velocity.z -= impulse.z / objectB.mass;
        }
    }

    dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
}

class SpatialHashGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    getCell(position) {
        const x = Math.floor(position.x / this.cellSize);
        const y = Math.floor(position.y / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${y},${z}`;
    }

    insert(object) {
        const cell = this.getCell(object.position);
        if (!this.grid.has(cell)) {
            this.grid.set(cell, new Set());
        }
        this.grid.get(cell).add(object);
    }

    remove(object) {
        const cell = this.getCell(object.position);
        if (this.grid.has(cell)) {
            this.grid.get(cell).delete(object);
        }
    }

    getNearbyObjects(position) {
        const cell = this.getCell(position);
        const [x, y, z] = cell.split(',').map(Number);
        const nearby = new Set();

        // Check neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const neighborCell = `${x + dx},${y + dy},${z + dz}`;
                    if (this.grid.has(neighborCell)) {
                        for (const object of this.grid.get(neighborCell)) {
                            nearby.add(object);
                        }
                    }
                }
            }
        }

        return nearby;
    }
} 