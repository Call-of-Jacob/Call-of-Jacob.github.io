class AdvancedUI {
    constructor() {
        this.scoreboardVisible = false;
        this.weaponWheelVisible = false;
        this.weaponWheelSelection = null;
        this.setupScoreboard();
        this.setupWeaponWheel();
        this.setupEventListeners();
    }

    setupScoreboard() {
        const scoreboard = document.createElement('div');
        scoreboard.id = 'scoreboard';
        scoreboard.className = 'scoreboard hidden';
        scoreboard.innerHTML = `
            <div class="scoreboard-header">
                <div class="col">Player</div>
                <div class="col">Kills</div>
                <div class="col">Deaths</div>
                <div class="col">Score</div>
                <div class="col">Ping</div>
            </div>
            <div class="scoreboard-body"></div>
        `;
        document.body.appendChild(scoreboard);
    }

    setupWeaponWheel() {
        const wheel = document.createElement('div');
        wheel.id = 'weapon-wheel';
        wheel.className = 'weapon-wheel hidden';
        document.body.appendChild(wheel);

        this.wheelContext = wheel.getContext('2d');
        this.wheelRadius = 150;
        this.weaponSlots = [
            { name: 'PRIMARY', angle: 0, weapon: null },
            { name: 'SECONDARY', angle: Math.PI * 0.4, weapon: null },
            { name: 'MELEE', angle: Math.PI * 0.8, weapon: null },
            { name: 'GRENADES', angle: Math.PI * 1.2, weapon: null },
            { name: 'EQUIPMENT', angle: Math.PI * 1.6, weapon: null }
        ];
    }

    setupEventListeners() {
        // Scoreboard
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Tab') {
                e.preventDefault();
                this.toggleScoreboard(true);
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Tab') {
                this.toggleScoreboard(false);
            }
        });

        // Weapon Wheel
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyQ') {
                this.showWeaponWheel();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'KeyQ') {
                this.hideWeaponWheel();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.weaponWheelVisible) {
                this.updateWeaponWheelSelection(e);
            }
        });
    }

    updateScoreboard(players) {
        if (!this.scoreboardVisible) return;

        const body = document.querySelector('.scoreboard-body');
        body.innerHTML = '';

        players.sort((a, b) => b.score - a.score);

        for (const player of players) {
            const row = document.createElement('div');
            row.className = 'scoreboard-row';
            row.innerHTML = `
                <div class="col">${player.name}</div>
                <div class="col">${player.kills}</div>
                <div class="col">${player.deaths}</div>
                <div class="col">${player.score}</div>
                <div class="col">${player.ping}ms</div>
            `;
            body.appendChild(row);
        }
    }

    drawWeaponWheel() {
        const ctx = this.wheelContext;
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw segments
        this.weaponSlots.forEach((slot, index) => {
            const startAngle = slot.angle - Math.PI * 0.2;
            const endAngle = slot.angle + Math.PI * 0.2;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, this.wheelRadius, startAngle, endAngle);
            ctx.closePath();

            ctx.fillStyle = slot === this.weaponWheelSelection ? 
                'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.5)';
            ctx.fill();
            ctx.stroke();

            // Draw weapon icon and name
            if (slot.weapon) {
                const iconX = centerX + Math.cos(slot.angle) * (this.wheelRadius * 0.7);
                const iconY = centerY + Math.sin(slot.angle) * (this.wheelRadius * 0.7);
                
                ctx.drawImage(slot.weapon.icon, iconX - 20, iconY - 20, 40, 40);
                
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText(slot.weapon.name, iconX, iconY + 30);
            }
        });
    }

    updateWeaponWheelSelection(mouseEvent) {
        const rect = this.wheelContext.canvas.getBoundingClientRect();
        const x = mouseEvent.clientX - rect.left - rect.width / 2;
        const y = mouseEvent.clientY - rect.top - rect.height / 2;
        
        const angle = Math.atan2(y, x);
        const distance = Math.sqrt(x * x + y * y);

        if (distance <= this.wheelRadius) {
            this.weaponWheelSelection = this.weaponSlots.find(slot => {
                const angleDiff = Math.abs(slot.angle - angle);
                return angleDiff < Math.PI * 0.2;
            });
        } else {
            this.weaponWheelSelection = null;
        }

        this.drawWeaponWheel();
    }

    toggleScoreboard(visible) {
        this.scoreboardVisible = visible;
        document.getElementById('scoreboard').classList.toggle('hidden', !visible);
        if (visible) {
            this.updateScoreboard(gameState.gameData.players);
        }
    }

    showWeaponWheel() {
        this.weaponWheelVisible = true;
        document.getElementById('weapon-wheel').classList.remove('hidden');
        this.drawWeaponWheel();
    }

    hideWeaponWheel() {
        this.weaponWheelVisible = false;
        document.getElementById('weapon-wheel').classList.add('hidden');
        
        if (this.weaponWheelSelection) {
            gameState.gameData.player.switchWeapon(this.weaponWheelSelection.weapon);
        }
    }
} 