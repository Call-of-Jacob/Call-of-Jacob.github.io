import { GameInitializer } from './game/core/GameInitializer';
import { NetworkClient } from './networking/NetworkClient';
import { AudioManager } from './audio/AudioManager';
import UIManager from './ui/UIManager';
import { Router } from './router/Router';
import { ErrorTracker } from './utils/ErrorTracker';
import { LoadingScreen } from './ui/LoadingScreen';
import { PhysicsSystem } from './physics/PhysicsSystem';
import { HitDetection } from './systems/hit_detection';
import { ParticleSystem } from './systems/particle_system';
import { ChallengeSystem } from './game/progression_challenges';
import { ProgressionSystem } from './game/progression_system';
import { LoadoutCustomizationUI } from './game/ui/loadout_customization_ui';
import { CombatSystem } from './game/combat_mechanics';
import { MapLoader } from './game/map/MapLoader';
import { auth as FirebaseAuth } from './config/firebase';
import { AuthUI } from './ui/AuthUI';

class CallOfJacob {
    constructor() {
        this.authUI = new AuthUI();
        this.initializeSystems();
        this.checkAuth();
    }

    initializeSystems() {
        this.errorTracker = new ErrorTracker();
        this.router = new Router();
        this.gameInitializer = new GameInitializer();
        this.networkClient = new NetworkClient();
        this.audioManager = new AudioManager();
        this.uiManager = new UIManager();
        this.physicsSystem = new PhysicsSystem();
        this.hitDetection = new HitDetection();
        this.particleSystem = new ParticleSystem();
        this.progressionSystem = new ProgressionSystem();
        this.challengeSystem = new ChallengeSystem(this.progressionSystem);
        this.loadoutUI = new LoadoutCustomizationUI(this.progressionSystem);
        this.combatSystem = new CombatSystem();
        this.mapLoader = new MapLoader();
        this.loadingScreen = new LoadingScreen();
    }

    async initialize() {
        try {
            // Initialize core systems
            await this.gameInitializer.initializeGame();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start game loop
            this.startGameLoop();
            
            console.log('Game initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.handleInitializationError(error);
        }
    }

    setupEventListeners() {
        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('blur', this.handleBlur.bind(this));
        window.addEventListener('focus', this.handleFocus.bind(this));
        
        // Game events
        document.addEventListener('gameStateChange', this.handleGameStateChange.bind(this));
        document.addEventListener('networkEvent', this.handleNetworkEvent.bind(this));
    }

    startGameLoop() {
        this.gameLoop = new GameLoop(this);
        this.gameLoop.start();
    }

    handleResize() {
        this.gameInitializer.renderer.handleResize();
        this.uiManager.handleResize();
    }

    handleBlur() {
        // Pause game when window loses focus
        if (this.gameLoop) {
            this.gameLoop.pause();
        }
        this.audioManager.pauseAll();
    }

    handleFocus() {
        // Resume game when window gains focus
        if (this.gameLoop && this.gameInitializer.gameState.currentState === 'PLAYING') {
            this.gameLoop.resume();
        }
        this.audioManager.resumeAll();
    }

    handleGameStateChange(event) {
        const { newState, oldState } = event.detail;
        this.uiManager.updateUI(newState);
        this.audioManager.handleStateChange(newState, oldState);
    }

    handleNetworkEvent(event) {
        const { type, data } = event.detail;
        this.networkClient.handleEvent(type, data);
    }

    handleInitializationError(error) {
        // Show error screen
        this.uiManager.showErrorScreen(error);
        
        // Log error to analytics
        this.logError(error);
    }

    logError(error) {
        // Implement error logging to your analytics service
        console.error('Game Error:', error);
    }

    async checkAuth() {
        const user = await FirebaseAuth.getCurrentUser();
        if (user) {
            this.initialize();
        } else {
            this.authUI.show();
        }
    }
}

// Start the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new CallOfJacob();
}); 