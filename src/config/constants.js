export const GAME_CONSTANTS = {
    PHYSICS: {
        GRAVITY: -9.81,
        MAX_VELOCITY: 20,
        JUMP_FORCE: 8
    },
    PLAYER: {
        MOVE_SPEED: 5,
        SPRINT_SPEED: 8,
        CROUCH_SPEED: 2,
        MAX_HEALTH: 100
    },
    WEAPONS: {
        RELOAD_TIMES: {
            RIFLE: 2.5,
            SMG: 2.0,
            PISTOL: 1.5
        }
    },
    NETWORK: {
        TICK_RATE: 60,
        INTERPOLATION_DELAY: 100
    }
};

export const ASSET_PATHS = {
    MODELS: '/assets/models/',
    TEXTURES: '/assets/textures/',
    SOUNDS: '/assets/sounds/',
    ANIMATIONS: '/assets/animations/'
};

export default { GAME_CONSTANTS, ASSET_PATHS }; 