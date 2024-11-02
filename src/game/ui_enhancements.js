class EnhancedUI {
    constructor(canvas) {
        this.minimapCanvas = document.createElement('canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.killFeed = [];
        this.maxKillFeedItems = 5;
        this.killFeedDuration = 5000; // 5 seconds
        
        this.setupMinimap();
        this.setupKillFeed();
    }

    setupMinimap() {
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
        this.minimapCanvas.className = 'minimap';
        document.querySelector('.minimap').appendChild(this.minimapCanvas);

        // Minimap settings
        this.minimapScale = 0.1; // 1 unit = 0.1 pixels
        this.minimapCenter = {
            x: this.minimapCanvas.width / 2,
            y: this.minimapCanvas.height / 2
        };
    }

    setupKillFeed() {
        this.killFeedContainer = document.querySelector('.kill-feed');
    }

    updateMinimap(gameState) {
        const ctx = this.minimapCtx;
        ctx.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

        // Draw background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

        // Draw map boundaries
        ctx.strokeStyle = '#444444';
        ctx.strokeRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

        // Draw player
        this.drawMinimapEntity(
            gameState.gameData.player.position,
            '#00ff00',
            4,
            gameState.gameData.player.rotation.y
        );

        // Draw enemies
        for (const enemy of gameState.gameData.enemies) {
            this.drawMinimapEntity(enemy.position, '#ff0000', 3, enemy.rotation.y);
        }

        // Draw objectives
        if (gameState.gameData.objectives) {
            for (const objective of gameState.gameData.objectives) {
                this.drawMinimapEntity(objective.position, '#ffff00', 5);
            }
        }
    }

    drawMinimapEntity(position, color, size, rotation = null) {
        const ctx = this.minimapCtx;
        const x = this.minimapCenter.x + position.x * this.minimapScale;
        const y = this.minimapCenter.y + position.z * this.minimapScale;

        ctx.save();
        ctx.translate(x, y);

        if (rotation !== null) {
            ctx.rotate(rotation);
        }

        ctx.fillStyle = color;
        ctx.beginPath();

        if (rotation !== null) {
            // Draw triangle for entities with direction
            ctx.moveTo(0, -size);
            ctx.lineTo(-size, size);
            ctx.lineTo(size, size);
        } else {
            // Draw circle for other entities
            ctx.arc(0, 0, size, 0, Math.PI * 2);
        }

        ctx.fill();
        ctx.restore();
    }

    addKillFeedMessage(killer, victim, weapon) {
        const message = {
            killer,
            victim,
            weapon,
            timestamp: Date.now()
        };

        this.killFeed.unshift(message);
        if (this.killFeed.length > this.maxKillFeedItems) {
            this.killFeed.pop();
        }

        this.updateKillFeedDisplay();
    }

    updateKillFeedDisplay() {
        this.killFeedContainer.innerHTML = '';
        const currentTime = Date.now();

        for (const message of this.killFeed) {
            if (currentTime - message.timestamp > this.killFeedDuration) continue;

            const element = document.createElement('div');
            element.className = 'kill-feed-item';
            element.innerHTML = `
                <span class="killer">${message.killer}</span>
                <img src="assets/icons/${message.weapon}.png" class="weapon-icon" />
                <span class="victim">${message.victim}</span>
            `;

            this.killFeedContainer.appendChild(element);
        }
    }

    cleanOldKillFeedMessages() {
        const currentTime = Date.now();
        this.killFeed = this.killFeed.filter(
            message => currentTime - message.timestamp <= this.killFeedDuration
        );
        this.updateKillFeedDisplay();
    }

    update() {
        this.updateMinimap(gameState);
        this.cleanOldKillFeedMessages();
    }
} 