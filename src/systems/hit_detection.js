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

    insert(entity) {
        const cell = this.getCell(entity.position);
        if (!this.grid.has(cell)) {
            this.grid.set(cell, new Set());
        }
        this.grid.get(cell).add(entity);
    }

    remove(entity) {
        const cell = this.getCell(entity.position);
        if (this.grid.has(cell)) {
            this.grid.get(cell).delete(entity);
        }
    }

    getNearbyEntities(position, radius) {
        const nearby = new Set();
        const cellRadius = Math.ceil(radius / this.cellSize);

        const centerCell = this.getCell(position);
        const [cx, cy, cz] = centerCell.split(',').map(Number);

        for (let x = cx - cellRadius; x <= cx + cellRadius; x++) {
            for (let y = cy - cellRadius; y <= cy + cellRadius; y++) {
                for (let z = cz - cellRadius; z <= cz + cellRadius; z++) {
                    const cell = `${x},${y},${z}`;
                    if (this.grid.has(cell)) {
                        this.grid.get(cell).forEach(entity => nearby.add(entity));
                    }
                }
            }
        }

        return Array.from(nearby).filter(entity => 
            this.getDistance(position, entity.position) <= radius
        );
    }

    getDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

class HitDetection {
    constructor() {
        this.spatialHash = new SpatialHashGrid(50);
        this.collisionLayers = new Map();
        this.raycastCache = new Map();
    }

    registerEntity(entity, layer) {
        if (!this.collisionLayers.has(layer)) {
            this.collisionLayers.set(layer, new Set());
        }
        this.collisionLayers.get(layer).add(entity);
        this.spatialHash.insert(entity);
    }

    unregisterEntity(entity, layer) {
        if (this.collisionLayers.has(layer)) {
            this.collisionLayers.get(layer).delete(entity);
        }
        this.spatialHash.remove(entity);
    }

    updateEntityPosition(entity) {
        this.spatialHash.remove(entity);
        this.spatialHash.insert(entity);
    }

    checkHit(origin, direction, range, layer) {
        // Normalize direction
        const dir = this.normalizeVector(direction);
        
        // Get potential targets using spatial hash
        const potentialTargets = this.spatialHash.getNearbyEntities(origin, range);
        
        // Filter by layer
        const layerEntities = this.collisionLayers.get(layer);
        const targets = potentialTargets.filter(entity => layerEntities?.has(entity));

        let closestHit = null;
        let closestDistance = Infinity;

        for (const target of targets) {
            const hit = this.raycastEntity(origin, dir, range, target);
            if (hit && hit.distance < closestDistance) {
                closestHit = hit;
                closestDistance = hit.distance;
            }
        }

        return closestHit;
    }

    raycastEntity(origin, direction, maxDistance, entity) {
        // Check bounding sphere first for quick rejection
        const sphereHit = this.raycastSphere(
            origin,
            direction,
            entity.position,
            entity.boundingRadius
        );

        if (!sphereHit) return null;

        // If entity has detailed collision mesh, use that
        if (entity.collisionMesh) {
            return this.raycastMesh(origin, direction, maxDistance, entity);
        }

        // Otherwise use the sphere hit
        return {
            entity,
            point: sphereHit.point,
            distance: sphereHit.distance,
            normal: sphereHit.normal
        };
    }

    raycastSphere(origin, direction, center, radius) {
        const oc = this.subtractVectors(origin, center);
        const a = this.dotProduct(direction, direction);
        const b = 2.0 * this.dotProduct(oc, direction);
        const c = this.dotProduct(oc, oc) - radius * radius;
        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return null;

        const distance = (-b - Math.sqrt(discriminant)) / (2.0 * a);
        if (distance < 0) return null;

        const point = this.addVectors(origin, this.multiplyVector(direction, distance));
        const normal = this.normalizeVector(this.subtractVectors(point, center));

        return { point, distance, normal };
    }

    raycastMesh(origin, direction, maxDistance, entity) {
        const cacheKey = `${entity.id}-${origin.x},${origin.y},${origin.z}-${direction.x},${direction.y},${direction.z}`;
        
        if (this.raycastCache.has(cacheKey)) {
            return this.raycastCache.get(cacheKey);
        }

        // Transform ray to model space
        const inverseMatrix = entity.getInverseWorldMatrix();
        const localOrigin = this.transformPoint(origin, inverseMatrix);
        const localDirection = this.transformDirection(direction, inverseMatrix);

        let closestHit = null;
        let closestDistance = Infinity;

        // Check each triangle in the mesh
        for (let i = 0; i < entity.collisionMesh.indices.length; i += 3) {
            const v0 = entity.collisionMesh.vertices[entity.collisionMesh.indices[i]];
            const v1 = entity.collisionMesh.vertices[entity.collisionMesh.indices[i + 1]];
            const v2 = entity.collisionMesh.vertices[entity.collisionMesh.indices[i + 2]];

            const hit = this.raycastTriangle(localOrigin, localDirection, v0, v1, v2);
            if (hit && hit.distance < closestDistance) {
                closestHit = hit;
                closestDistance = hit.distance;
            }
        }

        if (closestHit) {
            // Transform hit back to world space
            closestHit.point = this.transformPoint(closestHit.point, entity.worldMatrix);
            closestHit.normal = this.transformDirection(closestHit.normal, entity.worldMatrix);
            closestHit.entity = entity;
        }

        // Cache the result
        this.raycastCache.set(cacheKey, closestHit);
        setTimeout(() => this.raycastCache.delete(cacheKey), 100); // Clear cache after 100ms

        return closestHit;
    }

    raycastTriangle(origin, direction, v0, v1, v2) {
        // Möller–Trumbore intersection algorithm
        const edge1 = this.subtractVectors(v1, v0);
        const edge2 = this.subtractVectors(v2, v0);
        const h = this.crossProduct(direction, edge2);
        const a = this.dotProduct(edge1, h);

        if (Math.abs(a) < 1e-6) return null; // Ray parallel to triangle

        const f = 1.0 / a;
        const s = this.subtractVectors(origin, v0);
        const u = f * this.dotProduct(s, h);

        if (u < 0.0 || u > 1.0) return null;

        const q = this.crossProduct(s, edge1);
        const v = f * this.dotProduct(direction, q);

        if (v < 0.0 || u + v > 1.0) return null;

        const distance = f * this.dotProduct(edge2, q);
        if (distance < 0) return null;

        const point = this.addVectors(origin, this.multiplyVector(direction, distance));
        const normal = this.normalizeVector(this.crossProduct(edge1, edge2));

        return { point, distance, normal };
    }

    // Vector math utilities
    normalizeVector(v) {
        const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return {
            x: v.x / length,
            y: v.y / length,
            z: v.z / length
        };
    }

    dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    crossProduct(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    addVectors(a, b) {
        return {
            x: a.x + b.x,
            y: a.y + b.y,
            z: a.z + b.z
        };
    }

    subtractVectors(a, b) {
        return {
            x: a.x - b.x,
            y: a.y - b.y,
            z: a.z - b.z
        };
    }

    multiplyVector(v, scalar) {
        return {
            x: v.x * scalar,
            y: v.y * scalar,
            z: v.z * scalar
        };
    }

    transformPoint(point, matrix) {
        // Implement 4x4 matrix transformation
        // This is a simplified version, you'll need proper matrix math
        return point;
    }

    transformDirection(direction, matrix) {
        // Implement 4x4 matrix transformation for directions
        // This is a simplified version, you'll need proper matrix math
        return direction;
    }
} 