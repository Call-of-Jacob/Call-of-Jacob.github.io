import { EventEmitter } from 'events';
import * as THREE from 'three';
import Logger from '../../utils/Logger';
import AssetManager from '../../services/AssetManager';

class MapSystem extends EventEmitter {
    constructor() {
        super();
        this.currentMap = null;
        this.maps = new Map();
        this.scene = null;
        this.colliders = [];
        this.spawnPoints = [];
        this.navMesh = null;
        this.lightProbes = new Map();
        this.ambientLight = null;
        this.directionalLight = null;
        this.initialized = false;
    }

    async init(scene) {
        try {
            this.scene = scene;
            this.setupLighting();
            await this.loadMapConfigs();
            this.initialized = true;
            Logger.info('Map system initialized');
        } catch (error) {
            Logger.error('Failed to initialize map system:', error);
            throw error;
        }
    }

    setupLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambientLight);

        // Directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        this.directionalLight.position.set(100, 100, 50);
        this.directionalLight.castShadow = true;
        this.setupShadowMap();
        this.scene.add(this.directionalLight);
    }

    setupShadowMap() {
        const shadowMapSize = 4096;
        this.directionalLight.shadow.mapSize.width = shadowMapSize;
        this.directionalLight.shadow.mapSize.height = shadowMapSize;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.directionalLight.shadow.bias = -0.0001;
    }

    async loadMapConfigs() {
        try {
            const mapConfigs = await AssetManager.loadJSON('/assets/maps/configs.json');
            for (const config of mapConfigs) {
                this.maps.set(config.id, config);
            }
        } catch (error) {
            Logger.error('Failed to load map configs:', error);
            throw error;
        }
    }

    async loadMap(mapId) {
        if (!this.maps.has(mapId)) {
            throw new Error(`Map not found: ${mapId}`);
        }

        try {
            this.emit('mapLoadStart', mapId);
            const config = this.maps.get(mapId);

            // Clear current map
            this.clearCurrentMap();

            // Load map geometry
            const mapGeometry = await this.loadMapGeometry(config);
            this.scene.add(mapGeometry);

            // Load colliders
            await this.loadColliders(config);

            // Load navigation mesh
            await this.loadNavMesh(config);

            // Setup spawn points
            this.setupSpawnPoints(config);

            // Setup light probes
            await this.setupLightProbes(config);

            this.currentMap = {
                id: mapId,
                config,
                geometry: mapGeometry
            };

            this.emit('mapLoadComplete', mapId);
            return this.currentMap;
        } catch (error) {
            Logger.error(`Failed to load map ${mapId}:`, error);
            this.emit('mapLoadError', { mapId, error });
            throw error;
        }
    }

    async loadMapGeometry(config) {
        const loader = new THREE.GLTFLoader();
        const gltf = await loader.loadAsync(config.geometryPath);
        const model = gltf.scene;

        // Setup materials and textures
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                
                if (child.material) {
                    child.material.envMapIntensity = 1;
                    if (config.materialOverrides?.[child.name]) {
                        this.applyMaterialOverrides(child, config.materialOverrides[child.name]);
                    }
                }
            }
        });

        return model;
    }

    applyMaterialOverrides(mesh, overrides) {
        const material = mesh.material;
        Object.entries(overrides).forEach(([property, value]) => {
            if (property === 'map' || property === 'normalMap' || property === 'roughnessMap') {
                material[property] = AssetManager.getAsset(value);
            } else {
                material[property] = value;
            }
        });
    }

    async loadColliders(config) {
        this.colliders = [];
        for (const colliderConfig of config.colliders) {
            const collider = await this.createCollider(colliderConfig);
            this.colliders.push(collider);
        }
    }

    createCollider(config) {
        // Create collision geometry based on config type
        let geometry;
        switch (config.type) {
            case 'box':
                geometry = new THREE.Box3(
                    new THREE.Vector3(...config.min),
                    new THREE.Vector3(...config.max)
                );
                break;
            case 'sphere':
                geometry = new THREE.Sphere(
                    new THREE.Vector3(...config.center),
                    config.radius
                );
                break;
            default:
                throw new Error(`Unsupported collider type: ${config.type}`);
        }

        return {
            geometry,
            type: config.type,
            properties: config.properties || {}
        };
    }

    async loadNavMesh(config) {
        if (!config.navMeshPath) return;

        try {
            const loader = new THREE.GLTFLoader();
            const gltf = await loader.loadAsync(config.navMeshPath);
            this.navMesh = gltf.scene;
            // Hide navmesh but keep it for pathfinding
            this.navMesh.visible = false;
            this.scene.add(this.navMesh);
        } catch (error) {
            Logger.error('Failed to load navigation mesh:', error);
            throw error;
        }
    }

    setupSpawnPoints(config) {
        this.spawnPoints = config.spawnPoints.map(point => ({
            position: new THREE.Vector3(...point.position),
            rotation: new THREE.Euler(...point.rotation),
            team: point.team
        }));
    }

    async setupLightProbes(config) {
        this.lightProbes.clear();

        for (const probeConfig of config.lightProbes) {
            const probe = new THREE.LightProbe();
            probe.position.set(...probeConfig.position);
            probe.intensity = probeConfig.intensity || 1;
            this.scene.add(probe);
            this.lightProbes.set(probeConfig.id, probe);
        }
    }

    getSpawnPoint(team = null) {
        const validPoints = team 
            ? this.spawnPoints.filter(point => point.team === team)
            : this.spawnPoints;

        if (validPoints.length === 0) {
            throw new Error('No valid spawn points found');
        }

        return validPoints[Math.floor(Math.random() * validPoints.length)];
    }

    checkCollision(position, radius) {
        for (const collider of this.colliders) {
            if (this.testCollision(position, radius, collider)) {
                return true;
            }
        }
        return false;
    }

    testCollision(position, radius, collider) {
        switch (collider.type) {
            case 'box':
                return this.testBoxCollision(position, radius, collider.geometry);
            case 'sphere':
                return this.testSphereCollision(position, radius, collider.geometry);
            default:
                return false;
        }
    }

    testBoxCollision(position, radius, box) {
        const closestPoint = new THREE.Vector3();
        closestPoint.copy(position).clamp(box.min, box.max);
        return position.distanceTo(closestPoint) <= radius;
    }

    testSphereCollision(position, radius, sphere) {
        return position.distanceTo(sphere.center) <= (radius + sphere.radius);
    }

    clearCurrentMap() {
        if (this.currentMap) {
            this.scene.remove(this.currentMap.geometry);
            if (this.navMesh) {
                this.scene.remove(this.navMesh);
            }
            this.colliders = [];
            this.spawnPoints = [];
            this.lightProbes.forEach(probe => this.scene.remove(probe));
            this.lightProbes.clear();
        }
    }

    dispose() {
        this.clearCurrentMap();
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
        }
        if (this.directionalLight) {
            this.scene.remove(this.directionalLight);
        }
        this.removeAllListeners();
    }
}

export default new MapSystem(); 