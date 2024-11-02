class MapLoader {
    constructor() {
        this.maps = new Map();
        this.currentMap = null;
        this.collisionSystem = null;
    }

    async loadMap(mapId) {
        try {
            const response = await fetch(`/assets/maps/${mapId}.json`);
            const mapData = await response.json();
            
            // Create map instance
            const map = new GameMap(mapData);
            await this.loadMapAssets(map);
            
            this.maps.set(mapId, map);
            return map;
        } catch (error) {
            console.error(`Failed to load map ${mapId}:`, error);
            throw error;
        }
    }

    async loadMapAssets(map) {
        // Load textures
        const texturePromises = map.textures.map(texture => 
            this.loadTexture(texture.id, texture.url)
        );

        // Load models
        const modelPromises = map.models.map(model =>
            this.loadModel(model.id, model.url)
        );

        // Load collision data
        const collisionPromise = this.loadCollisionData(map.collisionMap);

        await Promise.all([
            ...texturePromises,
            ...modelPromises,
            collisionPromise
        ]);
    }

    async setActiveMap(mapId) {
        let map = this.maps.get(mapId);
        if (!map) {
            map = await this.loadMap(mapId);
        }

        this.currentMap = map;
        this.setupMapCollision(map);
        this.initializeSpawnPoints(map);
        this.setupMapLighting(map);
        
        return map;
    }

    setupMapCollision(map) {
        // Initialize collision system for the map
        this.collisionSystem = new CollisionSystem(map.collisionData);
        
        // Add static geometry
        map.staticGeometry.forEach(geo => {
            this.collisionSystem.addStaticGeometry(geo);
        });
    }

    initializeSpawnPoints(map) {
        // Set up team spawn points
        this.spawnPoints = {
            team1: map.spawnPoints.filter(sp => sp.team === 'team1'),
            team2: map.spawnPoints.filter(sp => sp.team === 'team2'),
            ffa: map.spawnPoints.filter(sp => sp.team === 'ffa')
        };
    }

    setupMapLighting(map) {
        // Create lighting based on map data
        map.lights.forEach(light => {
            switch (light.type) {
                case 'directional':
                    this.addDirectionalLight(light);
                    break;
                case 'point':
                    this.addPointLight(light);
                    break;
                case 'ambient':
                    this.setAmbientLight(light);
                    break;
            }
        });
    }

    getSpawnPoint(team, avoidPositions = []) {
        const spawnPoints = this.spawnPoints[team] || this.spawnPoints.ffa;
        
        // Find best spawn point (furthest from enemies)
        return this.findBestSpawnPoint(spawnPoints, avoidPositions);
    }

    findBestSpawnPoint(spawnPoints, avoidPositions) {
        let bestPoint = null;
        let maxDistance = -1;

        spawnPoints.forEach(point => {
            const minDistance = this.getMinDistance(point.position, avoidPositions);
            if (minDistance > maxDistance) {
                maxDistance = minDistance;
                bestPoint = point;
            }
        });

        return bestPoint;
    }

    getMinDistance(position, otherPositions) {
        if (otherPositions.length === 0) return Infinity;

        return Math.min(...otherPositions.map(pos => 
            this.calculateDistance(position, pos)
        ));
    }

    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    isPositionValid(position) {
        // Check if position is within map bounds
        if (!this.currentMap.isInBounds(position)) {
            return false;
        }

        // Check collision with static geometry
        return !this.collisionSystem.checkCollision(position);
    }

    raycast(origin, direction, maxDistance) {
        return this.collisionSystem.raycast(origin, direction, maxDistance);
    }
}

class GameMap {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.size = data.size;
        this.textures = data.textures;
        this.models = data.models;
        this.collisionData = data.collision;
        this.spawnPoints = data.spawnPoints;
        this.lights = data.lights;
        this.staticGeometry = data.staticGeometry;
        this.bounds = data.bounds;
        this.objectives = data.objectives || [];
        this.props = data.props || [];
    }

    isInBounds(position) {
        return position.x >= this.bounds.min.x && position.x <= this.bounds.max.x &&
               position.y >= this.bounds.min.y && position.y <= this.bounds.max.y &&
               position.z >= this.bounds.min.z && position.z <= this.bounds.max.z;
    }

    getObjectivePosition(id) {
        const objective = this.objectives.find(obj => obj.id === id);
        return objective ? objective.position : null;
    }

    getNearbyProps(position, radius) {
        return this.props.filter(prop => {
            const distance = this.calculateDistance(position, prop.position);
            return distance <= radius;
        });
    }
}

class CollisionSystem {
    constructor(collisionData) {
        this.staticGeometry = [];
        this.collisionTree = this.buildCollisionTree(collisionData);
    }

    addStaticGeometry(geometry) {
        this.staticGeometry.push(geometry);
        this.updateCollisionTree();
    }

    buildCollisionTree(collisionData) {
        // Implement octree or similar spatial partitioning
        // This is a simplified version
        return {
            bounds: collisionData.bounds,
            geometry: collisionData.geometry
        };
    }

    checkCollision(position) {
        // Check collision against static geometry
        for (const geo of this.staticGeometry) {
            if (this.checkGeometryCollision(position, geo)) {
                return true;
            }
        }
        return false;
    }

    raycast(origin, direction, maxDistance) {
        let closest = null;
        let closestDistance = maxDistance;

        // Check against static geometry
        this.staticGeometry.forEach(geo => {
            const hit = this.raycastGeometry(origin, direction, geo);
            if (hit && hit.distance < closestDistance) {
                closest = hit;
                closestDistance = hit.distance;
            }
        });

        return closest;
    }

    checkGeometryCollision(position, geometry) {
        // Implement actual geometry collision check
        // This is a simplified version
        const dx = position.x - geometry.position.x;
        const dy = position.y - geometry.position.y;
        const dz = position.z - geometry.position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return distance < geometry.radius;
    }

    raycastGeometry(origin, direction, geometry) {
        // Implement actual geometry raycast
        // This is a simplified version
        return null;
    }

    updateCollisionTree() {
        // Rebuild collision tree when geometry changes
        this.collisionTree = this.buildCollisionTree({
            bounds: this.calculateBounds(),
            geometry: this.staticGeometry
        });
    }

    calculateBounds() {
        // Calculate bounds of all static geometry
        // This is a simplified version
        return {
            min: { x: -1000, y: -1000, z: -1000 },
            max: { x: 1000, y: 1000, z: 1000 }
        };
    }
} 