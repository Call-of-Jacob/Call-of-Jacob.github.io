class AssetCache {
    constructor() {
        this.cache = new Map();
        this.indexedDB = window.indexedDB;
        this.DB_NAME = 'GameAssets';
        this.DB_VERSION = 1;
        this.initDatabase();
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            const request = this.indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('assets')) {
                    db.createObjectStore('assets', { keyPath: 'path' });
                }
            };
        });
    }

    async getAsset(path) {
        // Check memory cache first
        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        // Check IndexedDB
        try {
            const asset = await this.getFromDB(path);
            if (asset) {
                this.cache.set(path, asset.data);
                return asset.data;
            }
        } catch (error) {
            console.error('Error reading from cache:', error);
        }

        return null;
    }

    async cacheAsset(path, data) {
        // Store in memory
        this.cache.set(path, data);

        // Store in IndexedDB
        try {
            await this.saveToDB(path, data);
        } catch (error) {
            console.error('Error caching asset:', error);
        }
    }

    async getFromDB(path) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['assets'], 'readonly');
            const store = transaction.objectStore('assets');
            const request = store.get(path);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async saveToDB(path, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['assets'], 'readwrite');
            const store = transaction.objectStore('assets');
            const request = store.put({ path, data, timestamp: Date.now() });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    async clearCache() {
        this.cache.clear();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['assets'], 'readwrite');
            const store = transaction.objectStore('assets');
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }
}

export default new AssetCache(); 