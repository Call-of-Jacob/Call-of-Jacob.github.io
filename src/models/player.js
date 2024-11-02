// Convert from player.py
class Player {
    constructor(name, health = 100, position = null) {
        this.name = name;
        this.health = health;
        this.position = position || { x: 0, y: 0, z: 0 };
        this.weapons = [];
        this.current_weapon = null;
        this.is_crouching = false;
        this.is_aiming = false;
        this.movement_speed = 5;
        this.crouch_speed = 2.5;
        this.stamina = 100;
        
        // Add browser-specific features
        this.input_buffer = []; // For input prediction
        this.last_server_update = 0;
    }

    // Rest of the player logic converted from Python...
} 