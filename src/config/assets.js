export const ASSET_MANIFEST = {
    models: {
        'soldier': {
            path: '/assets/models/soldier_model.fbx',
            type: 'model'
        },
        'weapons': {
            path: '/assets/models/weapons/',
            type: 'model_directory'
        }
    },
    textures: {
        'terrain': {
            path: '/assets/textures/terrain_texture.png',
            type: 'texture'
        },
        'soldier': {
            path: '/assets/textures/soldier_texture.png',
            type: 'texture'
        }
    },
    sounds: {
        'gunshot': {
            path: '/assets/sounds/gunshot.wav',
            type: 'sound'
        },
        'footsteps': {
            path: '/assets/sounds/footsteps/',
            type: 'sound_directory'
        }
    },
    maps: {
        'city': {
            path: '/assets/maps/city_map.json',
            type: 'json'
        },
        'beach': {
            path: '/assets/maps/beach_map.json',
            type: 'json'
        }
    }
}; 