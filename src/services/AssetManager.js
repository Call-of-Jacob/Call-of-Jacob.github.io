import Logger from '../utils/Logger';
import { ASSET_PATHS } from '../config/constants';

class AssetManager {
    constructor() {
        this.assets = new Map();
        this.loadingPromises = new Map();
        this.preloadQueue = new Set();
        this.loadedCount = 0;
        this.totalAssets = 0;
        this.onProgressCallback = null;
        this.defaultAssets = {
            texture: '/assets/textures/default.png',
            model: null,
            sound: null
        };
    }

    async preloadAssets(assetList) {
        this.totalAssets = assetList.length;
        this.loadedCount = 0;

        const loadPromises = assetList.map(async (asset) => {
            try {
                await this.loadAsset(asset.path, asset.type);
                this.loadedCount++;
                this.updateProgress();
            } catch (error) {
                Logger.error(`Failed to preload asset: ${asset.path}`, error);
            }
        });

        await Promise.all(loadPromises);
    }

    async loadAsset(path, type) {
        try {
            if (this.assets.has(path)) {
                return this.assets.get(path);
            }

            const asset = await this.loadAssetWithFallback(path, type);
            this.assets.set(path, asset);
            return asset;
        } catch (error) {
            Logger.warn(`Failed to load asset: ${path}, using default`, error);
            return this.getDefaultAsset(type);
        }
    }

    async loadAssetWithFallback(path, type) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load asset: ${path}`);
            }
            return await this.processAsset(response, type);
        } catch (error) {
            return this.getDefaultAsset(type);
        }
    }

    getDefaultAsset(type) {
        return this.defaultAssets[type];
    }

    async loadTexture(path) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Failed to load texture: ${path}`));
            
            image.src = path;
        });
    }

    async loadModel(path) {
        const loader = new THREE.FBXLoader();
        try {
            return await loader.loadAsync(path);
        } catch (error) {
            throw new Error(`Failed to load model: ${path}`);
        }
    }

    async loadSound(path) {
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            throw new Error(`Failed to load sound: ${path}`);
        }
    }

    async loadJSON(path) {
        try {
            const response = await fetch(path);
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to load JSON: ${path}`);
        }
    }

    updateProgress() {
        if (this.onProgressCallback) {
            const progress = (this.loadedCount / this.totalAssets) * 100;
            this.onProgressCallback(progress);
        }
    }

    setProgressCallback(callback) {
        this.onProgressCallback = callback;
    }

    getAsset(path) {
        return this.assets.get(path);
    }

    clearCache() {
        this.assets.clear();
        this.loadingPromises.clear();
        this.preloadQueue.clear();
        this.loadedCount = 0;
        this.totalAssets = 0;
    }

    dispose() {
        this.assets.forEach((asset, path) => {
            if (asset.dispose) {
                asset.dispose();
            }
        });
        this.clearCache();
    }
}

export default new AssetManager(); 