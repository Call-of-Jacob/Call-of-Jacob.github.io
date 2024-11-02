import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

class FirebaseStorage {
    constructor() {
        this.storage = getStorage();
        this.cachedUrls = new Map();
    }

    async uploadAsset(file, path) {
        const storageRef = ref(this.storage, path);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    }

    async getAssetUrl(path) {
        if (this.cachedUrls.has(path)) {
            return this.cachedUrls.get(path);
        }

        const storageRef = ref(this.storage, path);
        const url = await getDownloadURL(storageRef);
        this.cachedUrls.set(path, url);
        return url;
    }

    async preloadAssets(paths) {
        const promises = paths.map(path => this.getAssetUrl(path));
        return await Promise.all(promises);
    }

    clearCache() {
        this.cachedUrls.clear();
    }

    async uploadUserContent(userId, file, type) {
        const extension = file.name.split('.').pop();
        const path = `user-content/${userId}/${type}/${Date.now()}.${extension}`;
        return await this.uploadAsset(file, path);
    }
}

export default new FirebaseStorage(); 