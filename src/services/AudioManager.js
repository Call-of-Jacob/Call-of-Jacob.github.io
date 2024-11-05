import { AudioContext, AudioBuffer } from 'web-audio-api';
import Logger from '../utils/Logger';

class AudioManager {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.sounds = new Map();
        this.musicTracks = new Map();
        this.currentMusic = null;
        this.listenerPosition = { x: 0, y: 0, z: 0 };
        this.initialized = false;
        this.categories = {
            MUSIC: 'music',
            SFX: 'sfx',
            VOICE: 'voice',
            AMBIENT: 'ambient'
        };
        this.volumes = {
            [this.categories.MUSIC]: 0.5,
            [this.categories.SFX]: 1.0,
            [this.categories.VOICE]: 1.0,
            [this.categories.AMBIENT]: 0.7
        };
    }

    async init() {
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);

            // Create category gains
            this.categoryGains = {};
            for (const category of Object.values(this.categories)) {
                const gain = this.context.createGain();
                gain.connect(this.masterGain);
                gain.gain.value = this.volumes[category];
                this.categoryGains[category] = gain;
            }

            this.initialized = true;
            await this.resumeAudioContext();
        } catch (error) {
            Logger.error('Failed to initialize audio system:', error);
            throw error;
        }
    }

    async resumeAudioContext() {
        if (this.context.state === 'suspended') {
            try {
                await this.context.resume();
            } catch (error) {
                Logger.error('Failed to resume audio context:', error);
            }
        }
    }

    async loadSound(id, url, category = this.categories.SFX) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            
            this.sounds.set(id, {
                buffer: audioBuffer,
                category
            });
        } catch (error) {
            Logger.error(`Failed to load sound: ${id}`, error);
        }
    }

    async loadMusic(id, url) {
        await this.loadSound(id, url, this.categories.MUSIC);
    }

    playSoundAtPosition(id, position, options = {}) {
        if (!this.initialized || !this.sounds.has(id)) return null;

        try {
            const sound = this.sounds.get(id);
            const source = this.context.createBufferSource();
            source.buffer = sound.buffer;

            // Create spatial audio
            const panner = this.context.createPanner();
            panner.panningModel = 'HRTF';
            panner.distanceModel = 'inverse';
            panner.refDistance = options.refDistance || 1;
            panner.maxDistance = options.maxDistance || 100;
            panner.rolloffFactor = options.rolloffFactor || 1;
            panner.setPosition(position.x, position.y, position.z);

            // Connect nodes
            source.connect(panner);
            panner.connect(this.categoryGains[sound.category]);

            // Apply options
            if (options.loop) source.loop = true;
            if (options.playbackRate) source.playbackRate.value = options.playbackRate;

            source.start(0);

            // Cleanup when finished
            source.onended = () => {
                panner.disconnect();
                source.disconnect();
            };

            return {
                source,
                panner,
                stop: () => source.stop(),
                setPosition: (pos) => panner.setPosition(pos.x, pos.y, pos.z),
                setVolume: (volume) => {
                    const gain = this.context.createGain();
                    gain.gain.value = volume;
                    source.disconnect();
                    source.connect(gain);
                    gain.connect(panner);
                }
            };
        } catch (error) {
            Logger.error(`Failed to play sound: ${id}`, error);
            return null;
        }
    }

    playMusic(id, fadeInDuration = 2) {
        if (!this.initialized || !this.sounds.has(id)) return;

        try {
            // Fade out current music
            if (this.currentMusic) {
                this.fadeOutMusic();
            }

            const music = this.sounds.get(id);
            const source = this.context.createBufferSource();
            source.buffer = music.buffer;
            source.loop = true;

            const gainNode = this.context.createGain();
            gainNode.gain.value = 0;

            source.connect(gainNode);
            gainNode.connect(this.categoryGains[this.categories.MUSIC]);

            source.start(0);
            gainNode.gain.linearRampToValueAtTime(
                1,
                this.context.currentTime + fadeInDuration
            );

            this.currentMusic = { source, gainNode };
        } catch (error) {
            Logger.error(`Failed to play music: ${id}`, error);
        }
    }

    fadeOutMusic(duration = 2) {
        if (!this.currentMusic) return;

        try {
            const { source, gainNode } = this.currentMusic;
            gainNode.gain.linearRampToValueAtTime(
                0,
                this.context.currentTime + duration
            );
            setTimeout(() => {
                source.stop();
                source.disconnect();
                gainNode.disconnect();
            }, duration * 1000);
            this.currentMusic = null;
        } catch (error) {
            Logger.error('Failed to fade out music:', error);
        }
    }

    updateListenerPosition(position, orientation) {
        if (!this.initialized) return;

        const listener = this.context.listener;
        
        if (listener.positionX) {
            // Modern API
            listener.positionX.value = position.x;
            listener.positionY.value = position.y;
            listener.positionZ.value = position.z;
            if (orientation) {
                listener.forwardX.value = orientation.forward.x;
                listener.forwardY.value = orientation.forward.y;
                listener.forwardZ.value = orientation.forward.z;
                listener.upX.value = orientation.up.x;
                listener.upY.value = orientation.up.y;
                listener.upZ.value = orientation.up.z;
            }
        } else {
            // Legacy API
            listener.setPosition(position.x, position.y, position.z);
            if (orientation) {
                listener.setOrientation(
                    orientation.forward.x, orientation.forward.y, orientation.forward.z,
                    orientation.up.x, orientation.up.y, orientation.up.z
                );
            }
        }

        this.listenerPosition = position;
    }

    setCategoryVolume(category, volume) {
        if (this.categoryGains[category]) {
            this.volumes[category] = volume;
            this.categoryGains[category].gain.value = volume;
        }
    }

    setMasterVolume(volume) {
        this.masterGain.gain.value = volume;
    }

    dispose() {
        if (this.currentMusic) {
            this.currentMusic.source.stop();
            this.currentMusic.source.disconnect();
            this.currentMusic.gainNode.disconnect();
        }

        this.sounds.clear();
        this.musicTracks.clear();
        this.currentMusic = null;

        if (this.context) {
            this.context.close();
        }
    }
}

export default new AudioManager(); 