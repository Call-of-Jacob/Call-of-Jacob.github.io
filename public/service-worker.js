const CACHE_NAME = 'call-of-jacob-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/scripts/bundle.js',
    '/assets/textures/',
    '/assets/models/',
    '/assets/sounds/'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
}); 