class AssetLoader {
    constructor() {
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
        this.totalAssets = 0;
        this.loadedCount = 0;
    }

    async loadAssets(assetManifest) {
        this.totalAssets = Object.keys(assetManifest).length;
        this.loadedCount = 0;

        const loaders = {
            'texture': this.loadTexture.bind(this),
            'model': this.loadModel.bind(this),
            'sound': this.loadSound.bind(this),
            'json': this.loadJSON.bind(this)
        };

        const loadingPromises = [];

        for (const [key, asset] of Object.entries(assetManifest)) {
            const loader = loaders[asset.type];
            if (loader) {
                loadingPromises.push(
                    loader(key, asset.path)
                        .then(() => this.updateProgress())
                );
            }
        }

        await Promise.all(loadingPromises);
    }

    async loadTexture(key, path) {
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const loadPromise = new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            
            image.onload = () => {
                this.loadedAssets.set(key, image);
                resolve(image);
            };
            
            image.onerror = () => reject(new Error(`Failed to load texture: ${path}`));
            image.src = path;
        });

        this.loadingPromises.set(key, loadPromise);
        return loadPromise;
    }

    async loadModel(key, path) {
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const loadPromise = fetch(path)
            .then(response => response.arrayBuffer())
            .then(buffer => {
                // Parse FBX buffer and convert to our internal format
                const model = this.parseFBX(buffer);
                this.loadedAssets.set(key, model);
                return model;
            });

        this.loadingPromises.set(key, loadPromise);
        return loadPromise;
    }

    async loadSound(key, path) {
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const loadPromise = fetch(path)
            .then(response => response.arrayBuffer())
            .then(buffer => {
                return new Promise((resolve, reject) => {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    audioContext.decodeAudioData(buffer,
                        (decodedData) => {
                            this.loadedAssets.set(key, decodedData);
                            resolve(decodedData);
                        },
                        (error) => reject(error)
                    );
                });
            });

        this.loadingPromises.set(key, loadPromise);
        return loadPromise;
    }

    async loadJSON(key, path) {
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const loadPromise = fetch(path)
            .then(response => response.json())
            .then(data => {
                this.loadedAssets.set(key, data);
                return data;
            });

        this.loadingPromises.set(key, loadPromise);
        return loadPromise;
    }

    getAsset(key) {
        return this.loadedAssets.get(key);
    }

    updateProgress() {
        this.loadedCount++;
        const progress = (this.loadedCount / this.totalAssets) * 100;
        
        // Update loading bar
        const progressBar = document.querySelector('.progress');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update loading text
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Loading assets... ${Math.round(progress)}%`;
        }
    }

    parseFBX(buffer) {
        // Basic FBX parser implementation
        // This would need to be expanded based on your specific needs
        return {
            vertices: new Float32Array(buffer),
            normals: new Float32Array(buffer),
            uvs: new Float32Array(buffer),
            indices: new Uint16Array(buffer)
        };
    }
} 