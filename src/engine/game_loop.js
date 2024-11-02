class GameLoop {
    constructor(gameState) {
        this.gameState = gameState;
        this.lastTime = 0;
        this.accumulator = 0;
        this.timeStep = 1000 / 60; // 60 FPS
        this.running = false;
        this.frameID = null;

        // Performance monitoring
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            this.frameID = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
        }
    }

    pause() {
        this.running = false;
        if (this.frameID !== null) {
            cancelAnimationFrame(this.frameID);
            this.frameID = null;
        }
    }

    resume() {
        if (!this.running) {
            this.start();
        }
    }

    gameLoop(currentTime) {
        if (!this.running) return;

        // Calculate delta time
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            this.updateFPSDisplay();
        }

        // Fixed time step accumulator
        this.accumulator += deltaTime;

        // Update game logic with fixed time step
        while (this.accumulator >= this.timeStep) {
            this.update(this.timeStep / 1000); // Convert to seconds
            this.accumulator -= this.timeStep;
        }

        // Render at screen refresh rate
        this.render();

        // Schedule next frame
        this.frameID = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    update(deltaTime) {
        // Update game state
        this.gameState.update(deltaTime);

        // Update physics
        physicsSystem.update(deltaTime);

        // Update animations
        animationSystem.update(deltaTime);

        // Update network state
        if (this.gameState.gameData.isMultiplayer) {
            networkManager.update();
        }
    }

    render() {
        // Clear the canvas
        renderer.clear();

        // Render the current scene
        if (this.gameState.currentState === GameState.States.PLAYING) {
            renderer.renderScene(this.gameState.gameData.currentMap);
            renderer.renderEntities([
                this.gameState.gameData.player,
                ...this.gameState.gameData.enemies
            ]);
        }

        // Update HUD
        this.updateHUD();
    }

    updateFPSDisplay() {
        const fpsDisplay = document.getElementById('fps-counter');
        if (fpsDisplay) {
            fpsDisplay.textContent = `FPS: ${this.fps}`;
        }
    }

    updateHUD() {
        if (this.gameState.currentState !== GameState.States.PLAYING) return;

        const player = this.gameState.gameData.player;
        
        // Update health bar
        const healthBar = document.querySelector('.health-fill');
        const healthText = document.querySelector('.health-text');
        if (healthBar && healthText) {
            const healthPercent = (player.health / 100) * 100;
            healthBar.style.width = `${healthPercent}%`;
            healthText.textContent = Math.ceil(player.health);
        }

        // Update ammo counter
        const currentAmmo = document.querySelector('.current-ammo');
        const totalAmmo = document.querySelector('.total-ammo');
        if (currentAmmo && totalAmmo && player.current_weapon) {
            currentAmmo.textContent = player.current_weapon.current_ammo;
            totalAmmo.textContent = player.current_weapon.total_ammo;
        }

        // Update score
        const scoreDisplay = document.querySelector('.score-display');
        if (scoreDisplay) {
            scoreDisplay.textContent = `Score: ${this.gameState.gameData.score}`;
        }
    }
} 