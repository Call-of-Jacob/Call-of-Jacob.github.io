class LoadoutCustomizationUI {
    constructor(progressionSystem) {
        this.progression = progressionSystem;
        this.setupUI();
        this.currentLoadout = null;
        this.selectedWeapon = null;
    }

    setupUI() {
        const container = document.createElement('div');
        container.id = 'loadout-customization';
        container.className = 'fullscreen-menu hidden';
        container.innerHTML = `
            <div class="loadout-menu">
                <div class="loadout-header">
                    <h2>Customize Loadout</h2>
                    <div class="loadout-tabs">
                        <button class="tab active" data-tab="weapons">Weapons</button>
                        <button class="tab" data-tab="perks">Perks</button>
                        <button class="tab" data-tab="equipment">Equipment</button>
                    </div>
                </div>

                <div class="loadout-content">
                    <div class="tab-content weapons active">
                        <div class="weapon-slots">
                            <div class="weapon-primary">
                                <h3>Primary Weapon</h3>
                                <div class="weapon-display"></div>
                                <div class="attachment-slots"></div>
                            </div>
                            <div class="weapon-secondary">
                                <h3>Secondary Weapon</h3>
                                <div class="weapon-display"></div>
                                <div class="attachment-slots"></div>
                            </div>
                        </div>
                        <div class="weapon-stats"></div>
                    </div>

                    <div class="tab-content perks">
                        <div class="perk-slots">
                            <div class="perk-slot" data-slot="1"></div>
                            <div class="perk-slot" data-slot="2"></div>
                            <div class="perk-slot" data-slot="3"></div>
                        </div>
                        <div class="perk-selection"></div>
                    </div>

                    <div class="tab-content equipment">
                        <div class="equipment-slots">
                            <div class="grenade-slot">
                                <h3>Grenades</h3>
                                <div class="grenade-selection"></div>
                            </div>
                            <div class="tactical-slot">
                                <h3>Tactical</h3>
                                <div class="tactical-selection"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="loadout-footer">
                    <button class="save-loadout">Save Loadout</button>
                    <button class="reset-loadout">Reset</button>
                </div>
            </div>

            <div class="weapon-customization-panel hidden">
                <h3>Customize Weapon</h3>
                <div class="attachment-categories"></div>
                <div class="attachment-options"></div>
                <div class="attachment-preview"></div>
            </div>
        `;

        document.body.appendChild(container);
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.loadout-tabs .tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });

        // Weapon selection
        document.querySelectorAll('.weapon-display').forEach(display => {
            display.addEventListener('click', () => this.openWeaponSelection(display));
        });

        // Perk selection
        document.querySelectorAll('.perk-slot').forEach(slot => {
            slot.addEventListener('click', () => this.openPerkSelection(slot));
        });

        // Save loadout
        document.querySelector('.save-loadout').addEventListener('click', () => {
            this.saveLoadout();
            this.hide();
        });

        // Reset loadout
        document.querySelector('.reset-loadout').addEventListener('click', () => {
            this.resetLoadout();
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });

        document.querySelector(`.tab-content.${tabName}`).classList.add('active');
        document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
    }

    openWeaponSelection(displayElement) {
        const weaponList = document.createElement('div');
        weaponList.className = 'weapon-selection-list';

        const availableWeapons = this.progression.getAvailableWeapons();
        availableWeapons.forEach(weapon => {
            const weaponElement = this.createWeaponElement(weapon);
            weaponList.appendChild(weaponElement);
        });

        displayElement.appendChild(weaponList);
    }

    createWeaponElement(weapon) {
        const element = document.createElement('div');
        element.className = 'weapon-option';
        element.innerHTML = `
            <img src="assets/weapons/${weapon.id}.png" alt="${weapon.name}">
            <div class="weapon-info">
                <h4>${weapon.name}</h4>
                <div class="weapon-stats">
                    <div class="stat">Damage: ${weapon.stats.damage}</div>
                    <div class="stat">Range: ${weapon.stats.range}</div>
                    <div class="stat">Fire Rate: ${weapon.stats.fireRate}</div>
                </div>
            </div>
            ${!weapon.unlocked ? `
                <div class="unlock-requirement">
                    Unlock at Level ${weapon.unlockLevel}
                </div>
            ` : ''}
        `;

        if (weapon.unlocked) {
            element.addEventListener('click', () => this.selectWeapon(weapon));
        }

        return element;
    }

    selectWeapon(weapon) {
        this.selectedWeapon = weapon;
        this.updateWeaponDisplay();
        this.showWeaponCustomization();
    }

    updateWeaponDisplay() {
        if (!this.selectedWeapon) return;

        const display = document.querySelector('.weapon-display');
        display.innerHTML = `
            <img src="assets/weapons/${this.selectedWeapon.id}.png" 
                 alt="${this.selectedWeapon.name}">
            <div class="weapon-info">
                <h4>${this.selectedWeapon.name}</h4>
                <div class="attachment-slots">
                    ${this.createAttachmentSlots()}
                </div>
            </div>
        `;
    }

    createAttachmentSlots() {
        return ['scope', 'barrel', 'magazine', 'grip'].map(type => `
            <div class="attachment-slot" data-type="${type}">
                <img src="assets/icons/${type}.png" alt="${type}">
                ${this.selectedWeapon.attachments[type] ? `
                    <img src="assets/attachments/${this.selectedWeapon.attachments[type].id}.png" 
                         alt="${this.selectedWeapon.attachments[type].name}">
                ` : ''}
            </div>
        `).join('');
    }

    showWeaponCustomization() {
        const panel = document.querySelector('.weapon-customization-panel');
        panel.classList.remove('hidden');
        this.updateAttachmentCategories();
    }

    updateAttachmentCategories() {
        const categories = document.querySelector('.attachment-categories');
        categories.innerHTML = '';

        ['scope', 'barrel', 'magazine', 'grip'].forEach(type => {
            const category = document.createElement('div');
            category.className = 'attachment-category';
            category.dataset.type = type;
            category.innerHTML = `
                <img src="assets/icons/${type}.png" alt="${type}">
                <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
            `;
            category.addEventListener('click', () => this.showAttachmentOptions(type));
            categories.appendChild(category);
        });
    }

    showAttachmentOptions(type) {
        const options = document.querySelector('.attachment-options');
        options.innerHTML = '';

        const attachments = this.progression.getAttachmentsForType(type);
        attachments.forEach(attachment => {
            const option = document.createElement('div');
            option.className = 'attachment-option';
            option.innerHTML = `
                <img src="assets/attachments/${attachment.id}.png" 
                     alt="${attachment.name}">
                <div class="attachment-info">
                    <h4>${attachment.name}</h4>
                    <div class="attachment-stats">
                        ${this.createAttachmentStats(attachment)}
                    </div>
                </div>
            `;
            option.addEventListener('click', () => this.equipAttachment(type, attachment));
            options.appendChild(option);
        });
    }

    createAttachmentStats(attachment) {
        return Object.entries(attachment.stats)
            .map(([stat, value]) => `
                <div class="stat ${value > 0 ? 'positive' : 'negative'}">
                    ${stat}: ${value > 0 ? '+' : ''}${value}
                </div>
            `).join('');
    }

    equipAttachment(type, attachment) {
        if (this.selectedWeapon) {
            this.selectedWeapon.attachments[type] = attachment;
            this.updateWeaponDisplay();
            this.updateWeaponStats();
        }
    }

    updateWeaponStats() {
        const statsDisplay = document.querySelector('.weapon-stats');
        const stats = this.calculateWeaponStats();
        
        statsDisplay.innerHTML = Object.entries(stats)
            .map(([stat, value]) => `
                <div class="stat-bar">
                    <label>${stat}</label>
                    <div class="bar">
                        <div class="fill" style="width: ${value}%"></div>
                    </div>
                </div>
            `).join('');
    }

    calculateWeaponStats() {
        if (!this.selectedWeapon) return {};

        let stats = { ...this.selectedWeapon.baseStats };
        
        // Apply attachment modifiers
        Object.values(this.selectedWeapon.attachments).forEach(attachment => {
            if (attachment) {
                Object.entries(attachment.stats).forEach(([stat, modifier]) => {
                    stats[stat] = (stats[stat] || 0) + modifier;
                });
            }
        });

        return stats;
    }

    saveLoadout() {
        if (this.currentLoadout) {
            this.progression.saveLoadout(this.currentLoadout);
        }
    }

    resetLoadout() {
        this.selectedWeapon = null;
        this.currentLoadout = null;
        this.updateWeaponDisplay();
        this.updateWeaponStats();
    }

    show() {
        document.getElementById('loadout-customization').classList.remove('hidden');
    }

    hide() {
        document.getElementById('loadout-customization').classList.add('hidden');
    }
} 