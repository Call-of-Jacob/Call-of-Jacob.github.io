import { EventEmitter } from 'events';
import Logger from '../utils/Logger';
import GameStateManager from '../game/GameStateManager';

class UIManager extends EventEmitter {
    constructor() {
        super();
        this.screens = new Map();
        this.activeScreen = null;
        this.overlays = new Set();
        this.notifications = [];
        this.maxNotifications = 5;
        this.notificationDuration = 5000;
        this.initialized = false;
        this.uiElements = new Map();
        this.eventListeners = new Map();
    }

    init() {
        try {
            this.setupScreens();
            this.setupOverlays();
            this.setupEventListeners();
            this.initialized = true;
            Logger.info('UI Manager initialized');
        } catch (error) {
            Logger.error('Failed to initialize UI Manager:', error);
            throw error;
        }
    }

    setupScreens() {
        // Main menu screen
        this.registerScreen('mainMenu', {
            element: document.getElementById('main-menu'),
            onShow: () => this.handleMainMenuShow(),
            onHide: () => this.handleMainMenuHide()
        });

        // Game HUD
        this.registerScreen('gameHUD', {
            element: document.getElementById('game-hud'),
            onShow: () => this.handleGameHUDShow(),
            onHide: () => this.handleGameHUDHide()
        });

        // Loadout screen
        this.registerScreen('loadout', {
            element: document.getElementById('loadout-screen'),
            onShow: () => this.handleLoadoutShow(),
            onHide: () => this.handleLoadoutHide()
        });

        // Settings screen
        this.registerScreen('settings', {
            element: document.getElementById('settings-screen'),
            onShow: () => this.handleSettingsShow(),
            onHide: () => this.handleSettingsHide()
        });
    }

    setupOverlays() {
        // Pause overlay
        this.registerOverlay('pause', {
            element: document.getElementById('pause-overlay'),
            onShow: () => this.handlePauseShow(),
            onHide: () => this.handlePauseHide()
        });

        // Loading overlay
        this.registerOverlay('loading', {
            element: document.getElementById('loading-overlay'),
            onShow: () => this.handleLoadingShow(),
            onHide: () => this.handleLoadingHide()
        });

        // Notification overlay
        this.registerOverlay('notifications', {
            element: document.getElementById('notification-overlay'),
            onShow: () => {},
            onHide: () => {}
        });
    }

    setupEventListeners() {
        // Listen for game state changes
        GameStateManager.on('stateChanged', (event) => {
            this.handleGameStateChange(event);
        });

        // Setup keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    registerScreen(id, screen) {
        this.screens.set(id, {
            ...screen,
            visible: false
        });
    }

    registerOverlay(id, overlay) {
        this.overlays.add({
            id,
            ...overlay,
            visible: false
        });
    }

    showScreen(id) {
        if (!this.screens.has(id)) {
            Logger.error(`Screen not found: ${id}`);
            return;
        }

        // Hide current screen
        if (this.activeScreen) {
            const currentScreen = this.screens.get(this.activeScreen);
            currentScreen.visible = false;
            currentScreen.element.classList.add('hidden');
            currentScreen.onHide();
        }

        // Show new screen
        const newScreen = this.screens.get(id);
        newScreen.visible = true;
        newScreen.element.classList.remove('hidden');
        newScreen.onShow();
        this.activeScreen = id;

        this.emit('screenChanged', id);
    }

    toggleOverlay(id, show) {
        const overlay = Array.from(this.overlays).find(o => o.id === id);
        if (!overlay) {
            Logger.error(`Overlay not found: ${id}`);
            return;
        }

        overlay.visible = show;
        if (show) {
            overlay.element.classList.remove('hidden');
            overlay.onShow();
        } else {
            overlay.element.classList.add('hidden');
            overlay.onHide();
        }

        this.emit('overlayToggled', { id, visible: show });
    }

    showNotification(message, type = 'info', duration = this.notificationDuration) {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: Date.now()
        };

        this.notifications.push(notification);
        if (this.notifications.length > this.maxNotifications) {
            this.notifications.shift();
        }

        this.renderNotifications();

        setTimeout(() => {
            this.removeNotification(notification.id);
        }, duration);

        return notification.id;
    }

    removeNotification(id) {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications.splice(index, 1);
            this.renderNotifications();
        }
    }

    renderNotifications() {
        const container = document.getElementById('notification-container');
        if (!container) return;

        container.innerHTML = '';
        this.notifications.forEach(notification => {
            const element = document.createElement('div');
            element.className = `notification notification-${notification.type}`;
            element.textContent = notification.message;
            container.appendChild(element);
        });
    }

    updateHUD(data) {
        if (!this.screens.get('gameHUD')?.visible) return;

        Object.entries(data).forEach(([key, value]) => {
            const element = this.uiElements.get(key);
            if (element) {
                if (typeof value === 'number') {
                    element.textContent = Math.round(value);
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    handleGameStateChange(event) {
        switch (event.to) {
            case GameStateManager.states.MENU:
                this.showScreen('mainMenu');
                break;
            case GameStateManager.states.PLAYING:
                this.showScreen('gameHUD');
                break;
            case GameStateManager.states.PAUSED:
                this.toggleOverlay('pause', true);
                break;
            default:
                break;
        }
    }

    handleKeyPress(event) {
        switch (event.code) {
            case 'Escape':
                if (GameStateManager.isPlaying()) {
                    GameStateManager.changeState(GameStateManager.states.PAUSED);
                }
                break;
            case 'Tab':
                if (GameStateManager.isPlaying()) {
                    event.preventDefault();
                    this.toggleOverlay('scoreboard', event.type === 'keydown');
                }
                break;
        }
    }

    handleResize() {
        // Update UI element positions and sizes
        this.emit('resize');
    }

    dispose() {
        this.screens.clear();
        this.overlays.clear();
        this.notifications = [];
        this.uiElements.clear();
        this.eventListeners.clear();
        this.initialized = false;
    }
}

export default new UIManager(); 