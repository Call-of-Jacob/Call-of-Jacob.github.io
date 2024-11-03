class UIManager {
    constructor() {
        this.screens = new Map();
        this.currentScreen = null;
        this.initializeScreens();
    }

    initializeScreens() {
        // Initialize different UI screens
        this.screens.set('loading', document.getElementById('loading-screen'));
        this.screens.set('auth', document.getElementById('auth-screen'));
        this.screens.set('main-menu', document.getElementById('game-ui'));
        this.screens.set('game', document.getElementById('game-canvas'));
    }

    showScreen(screenId) {
        // Hide current screen
        if (this.currentScreen) {
            this.screens.get(this.currentScreen).classList.add('hidden');
        }

        // Show new screen
        const screen = this.screens.get(screenId);
        if (screen) {
            screen.classList.remove('hidden');
            this.currentScreen = screenId;
        }
    }

    hideAllScreens() {
        this.screens.forEach(screen => {
            screen.classList.add('hidden');
        });
        this.currentScreen = null;
    }

    updateUI(gameState) {
        // Update UI elements based on game state
        if (gameState.health) {
            this.updateHealthBar(gameState.health);
        }
        if (gameState.ammo) {
            this.updateAmmoCount(gameState.ammo);
        }
        if (gameState.score) {
            this.updateScore(gameState.score);
        }
    }

    showErrorScreen(error) {
        const errorScreen = document.createElement('div');
        errorScreen.className = 'error-screen overlay';
        errorScreen.innerHTML = `
            <div class="error-content">
                <h2>Error</h2>
                <p>${error.message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
        document.body.appendChild(errorScreen);
    }

    updateHealthBar(health) {
        const healthBar = document.querySelector('.health-bar');
        if (healthBar) {
            healthBar.style.width = `${health}%`;
        }
    }

    updateAmmoCount(ammo) {
        const ammoCounter = document.querySelector('.ammo-counter');
        if (ammoCounter) {
            ammoCounter.textContent = ammo;
        }
    }

    updateScore(score) {
        const scoreDisplay = document.querySelector('.score-display');
        if (scoreDisplay) {
            scoreDisplay.textContent = score;
        }
    }
}

export default new UIManager(); 