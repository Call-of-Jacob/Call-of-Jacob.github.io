class GameInitializer {
    constructor() {
        this.loadingProgress = 0;
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    async initializeGame() {
        try {
            // Show loading screen
            this.showLoadingScreen();

            // Initialize core systems
            await this.initializeSystems();

            // Load assets
            await this.loadAssets();

            // Initialize game state
            await this.initializeGameState();

            // Initialize networking
            await this.initializeNetworking();

            // Hide loading screen
            this.hideLoadingScreen();

            return true;
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.remove('hidden');
        this.updateLoadingProgress(0);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.add('hidden');
    }

    updateLoadingProgress(progress) {
        const progressBar = document.querySelector('.progress');
        const progressText = document.querySelector('.loading-text');
        
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Loading... ${Math.round(progress)}%`;
    }

    async initializeSystems() {
        // Initialize renderer
        this.renderer = new WebGLRenderer(document.getElementById('game-canvas'));
        
        // Initialize sound system
        this.soundSystem = new SoundSystem();
        
        // Initialize input system
        this.inputSystem = new InputSystem();
        
        // Initialize physics system
        this.physicsSystem = new PhysicsSystem();
        
        // Initialize UI system
        this.uiSystem = new UISystem();
    }

    async loadAssets() {
        const assetLoader = new AssetLoader();
        
        // Register all assets to load
        this.totalAssets = assetLoader.registerAssets({
            models: [
                'soldier_model.fbx',
                // Add other models
            ],
            textures: [
                'soldier_texture.png',
                'terrain_texture.png',
                // Add other textures
            ],
            sounds: [
                'gunshot.wav',
                // Add other sounds
            ],
            maps: [
                'city_map.json',
                'beach_map.json'
            ]
        });

        // Load assets with progress tracking
        return new Promise((resolve, reject) => {
            assetLoader.onProgress = (loaded) => {
                this.loadedAssets = loaded;
                const progress = (loaded / this.totalAssets) * 100;
                this.updateLoadingProgress(progress);
            };

            assetLoader.onComplete = resolve;
            assetLoader.onError = reject;
            assetLoader.startLoading();
        });
    }

    async initializeGameState() {
        this.gameState = new GameState();
        await this.gameState.initialize();
    }

    async initializeNetworking() {
        this.networkManager = new NetworkManager();
        await this.networkManager.connect();
    }

    handleInitializationError(error) {
        // Show error screen
        const errorScreen = document.createElement('div');
        errorScreen.className = 'error-screen overlay';
        errorScreen.innerHTML = `
            <div class="error-content">
                <h2>Initialization Error</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
        document.body.appendChild(errorScreen);
    }
} 