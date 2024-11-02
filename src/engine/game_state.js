class GameState {
    static States = {
        LOADING: 'loading',
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'game_over'
    };

    constructor() {
        this.currentState = GameState.States.LOADING;
        this.previousState = null;
        this.stateHandlers = new Map();
        this.gameData = {
            player: null,
            enemies: new Set(),
            score: 0,
            currentMap: null,
            gameMode: null,
            matchTime: 0,
            isMultiplayer: false
        };

        this.setupStateHandlers();
    }

    setupStateHandlers() {
        this.stateHandlers.set(GameState.States.LOADING, {
            enter: () => {
                document.getElementById('loading-screen').classList.remove('hidden');
                document.getElementById('main-menu').classList.add('hidden');
                document.getElementById('hud').classList.add('hidden');
            },
            exit: () => {
                document.getElementById('loading-screen').classList.add('hidden');
            }
        });

        this.stateHandlers.set(GameState.States.MENU, {
            enter: () => {
                document.getElementById('main-menu').classList.remove('hidden');
                document.getElementById('hud').classList.add('hidden');
            },
            exit: () => {
                document.getElementById('main-menu').classList.add('hidden');
            }
        });

        this.stateHandlers.set(GameState.States.PLAYING, {
            enter: () => {
                document.getElementById('hud').classList.remove('hidden');
                this.startMatch();
            },
            exit: () => {
                this.saveGameState();
            }
        });

        this.stateHandlers.set(GameState.States.PAUSED, {
            enter: () => {
                this.pauseGame();
            },
            exit: () => {
                this.resumeGame();
            }
        });

        this.stateHandlers.set(GameState.States.GAME_OVER, {
            enter: () => {
                this.showGameOverScreen();
            },
            exit: () => {
                this.cleanupMatch();
            }
        });
    }

    changeState(newState) {
        if (!GameState.States[newState]) {
            console.error(`Invalid state: ${newState}`);
            return;
        }

        const currentHandler = this.stateHandlers.get(this.currentState);
        if (currentHandler && currentHandler.exit) {
            currentHandler.exit();
        }

        this.previousState = this.currentState;
        this.currentState = newState;

        const newHandler = this.stateHandlers.get(newState);
        if (newHandler && newHandler.enter) {
            newHandler.enter();
        }

        this.onStateChange(newState);
    }

    startMatch() {
        this.gameData.matchTime = 0;
        this.gameData.score = 0;
        
        // Initialize player
        this.gameData.player = {
            health: 100,
            ammo: this.gameData.gameMode.startingAmmo,
            position: this.gameData.currentMap.getSpawnPoint(),
            weapons: this.gameData.gameMode.startingWeapons
        };

        // Initialize AI enemies
        this.spawnEnemies();

        // Start game loop
        this.gameLoop.start();
    }

    spawnEnemies() {
        const spawnPoints = this.gameData.currentMap.getEnemySpawnPoints();
        const enemyCount = this.gameData.gameMode.enemyCount;

        for (let i = 0; i < enemyCount; i++) {
            const spawnPoint = spawnPoints[i % spawnPoints.length];
            const enemy = new AI(
                this.gameData.gameMode.difficulty,
                spawnPoint,
                100 // health
            );
            this.gameData.enemies.add(enemy);
        }
    }

    pauseGame() {
        this.gameLoop.pause();
        // Show pause menu
        document.getElementById('pause-menu').classList.remove('hidden');
    }

    resumeGame() {
        this.gameLoop.resume();
        document.getElementById('pause-menu').classList.add('hidden');
    }

    saveGameState() {
        // Save current game state to localStorage or server
        const saveData = {
            player: this.gameData.player,
            score: this.gameData.score,
            matchTime: this.gameData.matchTime
        };
        localStorage.setItem('gameState', JSON.stringify(saveData));
    }

    loadGameState() {
        const savedState = localStorage.getItem('gameState');
        if (savedState) {
            const data = JSON.parse(savedState);
            Object.assign(this.gameData, data);
        }
    }

    showGameOverScreen() {
        const gameOverScreen = document.createElement('div');
        gameOverScreen.className = 'overlay';
        gameOverScreen.innerHTML = `
            <div class="game-over-content">
                <h2>Game Over</h2>
                <p>Score: ${this.gameData.score}</p>
                <p>Time: ${Math.floor(this.gameData.matchTime / 60)}:${(this.gameData.matchTime % 60).toString().padStart(2, '0')}</p>
                <button onclick="gameState.changeState(GameState.States.MENU)">Main Menu</button>
                <button onclick="gameState.changeState(GameState.States.PLAYING)">Play Again</button>
            </div>
        `;
        document.body.appendChild(gameOverScreen);
    }

    cleanupMatch() {
        this.gameData.enemies.clear();
        this.gameData.player = null;
        this.gameData.score = 0;
        this.gameData.matchTime = 0;
    }

    update(deltaTime) {
        if (this.currentState === GameState.States.PLAYING) {
            this.gameData.matchTime += deltaTime;
            this.updateGameLogic(deltaTime);
        }
    }

    updateGameLogic(deltaTime) {
        // Update player
        if (this.gameData.player) {
            this.updatePlayer(deltaTime);
        }

        // Update AI
        for (const enemy of this.gameData.enemies) {
            this.updateEnemy(enemy, deltaTime);
        }

        // Check win/lose conditions
        this.checkGameOver();
    }

    updatePlayer(deltaTime) {
        // Handle player movement and actions
        const player = this.gameData.player;
        
        // Update position based on input
        if (inputManager.isMovingForward()) player.move("forward", deltaTime);
        if (inputManager.isMovingBackward()) player.move("backward", deltaTime);
        if (inputManager.isMovingLeft()) player.move("left", deltaTime);
        if (inputManager.isMovingRight()) player.move("right", deltaTime);

        // Handle shooting
        if (inputManager.isMouseButtonPressed(0)) { // Left click
            player.shoot();
        }

        // Handle reloading
        if (inputManager.isReloading()) {
            player.reload();
        }
    }

    updateEnemy(enemy, deltaTime) {
        const action = enemy.decide_action(this.gameData.player.position);
        if (action) {
            this.handleEnemyAction(enemy, action);
        }
    }

    handleEnemyAction(enemy, action) {
        switch (action.action) {
            case 'move':
                // Handle enemy movement
                break;
            case 'attack':
                if (action.damage > 0) {
                    this.gameData.player.take_damage(action.damage);
                }
                break;
            case 'cover':
                // Handle enemy taking cover
                break;
        }
    }

    checkGameOver() {
        if (this.gameData.player.health <= 0) {
            this.changeState(GameState.States.GAME_OVER);
        }
        
        if (this.gameData.enemies.size === 0) {
            // Player won
            this.gameData.score += 1000; // Victory bonus
            this.changeState(GameState.States.GAME_OVER);
        }
    }

    onStateChange(newState) {
        // Dispatch event for UI updates
        const event = new CustomEvent('gamestatechange', { 
            detail: { state: newState } 
        });
        document.dispatchEvent(event);
    }
} 