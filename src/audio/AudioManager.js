class AudioManager {
    constructor() {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.context.createGain();
        this.masterGain.connect(this.context.destination);
        
        this.sounds = new Map();
        this.music = new Map();
        this.currentMusic = null;
        
        this.categories = {
            sfx: this.context.createGain(),
            music: this.context.createGain(),
            ambient: this.context.createGain(),
            voice: this.context.createGain()
        };
        
        // Connect category gains to master
        Object.values(this.categories).forEach(gain => {
            gain.connect(this.masterGain);
        });
        
        this.volumes = {
            master: 1,
            sfx: 0.7,
            music: 0.5,
            ambient: 0.3,
            voice: 1
        };
        
        this.initializeVolumes();
    }

    initializeVolumes() {
        Object.entries(this.volumes).forEach(([category, volume]) => {
            if (category === 'master') {
                this.masterGain.gain.value = volume;
            } else {
                this.categories[category].gain.value = volume;
            }
        });
    }

    async loadSound(id, url, category = 'sfx') {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            
            this.sounds.set(id, {
                buffer: audioBuffer,
                category
            });
            
            return true;
        } catch (error) {
            console.error(`Error loading sound ${id}:`, error);
            return false;
        }
    }

    async loadMusic(id, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            
            this.music.set(id, audioBuffer);
            return true;
        } catch (error) {
            console.error(`Error loading music ${id}:`, error);
            return false;
        }
    }

    playSound(id, options = {}) {
        const sound = this.sounds.get(id);
        if (!sound) return null;

        const source = this.context.createBufferSource();
        source.buffer = sound.buffer;

        // Create gain node for this instance
        const gainNode = this.context.createGain();
        gainNode.gain.value = options.volume || 1;

        // Create panner if position is specified
        let panner = null;
        if (options.position) {
            panner = this.context.createPanner();
            panner.setPosition(
                options.position.x,
                options.position.y,
                options.position.z
            );
        }

        // Connect nodes
        source.connect(gainNode);
        if (panner) {
            gainNode.connect(panner);
            panner.connect(this.categories[sound.category]);
        } else {
            gainNode.connect(this.categories[sound.category]);
        }

        // Start playback
        source.start(0);

        // Handle looping
        if (options.loop) {
            source.loop = true;
        }

        return {
            source,
            gainNode,
            panner,
            stop: () => source.stop(),
            setVolume: (volume) => {
                gainNode.gain.value = volume;
            },
            setPosition: (position) => {
                if (panner) {
                    panner.setPosition(position.x, position.y, position.z);
                }
            }
        };
    }

    playMusic(id, fadeInTime = 2) {
        const musicBuffer = this.music.get(id);
        if (!musicBuffer) return;

        // Stop current music if playing
        if (this.currentMusic) {
            this.stopMusic();
        }

        const source = this.context.createBufferSource();
        source.buffer = musicBuffer;
        source.loop = true;

        const gainNode = this.context.createGain();
        gainNode.gain.value = 0;

        source.connect(gainNode);
        gainNode.connect(this.categories.music);

        source.start(0);

        // Fade in
        gainNode.gain.linearRampToValueAtTime(
            1,
            this.context.currentTime + fadeInTime
        );

        this.currentMusic = {
            source,
            gainNode
        };
    }

    stopMusic(fadeOutTime = 2) {
        if (!this.currentMusic) return;

        const { gainNode, source } = this.currentMusic;

        // Fade out
        gainNode.gain.linearRampToValueAtTime(
            0,
            this.context.currentTime + fadeOutTime
        );

        // Stop after fade
        setTimeout(() => {
            source.stop();
        }, fadeOutTime * 1000);

        this.currentMusic = null;
    }

    setVolume(category, volume) {
        volume = Math.max(0, Math.min(1, volume));
        
        if (category === 'master') {
            this.masterGain.gain.value = volume;
            this.volumes.master = volume;
        } else if (this.categories[category]) {
            this.categories[category].gain.value = volume;
            this.volumes[category] = volume;
        }
    }

    updateListenerPosition(position, orientation) {
        const listener = this.context.listener;
        
        if (listener.positionX) {
            // Modern API
            listener.positionX.value = position.x;
            listener.positionY.value = position.y;
            listener.positionZ.value = position.z;
            
            listener.forwardX.value = orientation.forward.x;
            listener.forwardY.value = orientation.forward.y;
            listener.forwardZ.value = orientation.forward.z;
            
            listener.upX.value = orientation.up.x;
            listener.upY.value = orientation.up.y;
            listener.upZ.value = orientation.up.z;
        } else {
            // Legacy API
            listener.setPosition(position.x, position.y, position.z);
            listener.setOrientation(
                orientation.forward.x, orientation.forward.y, orientation.forward.z,
                orientation.up.x, orientation.up.y, orientation.up.z
            );
        }
    }

    pauseAll() {
        this.context.suspend();
    }

    resumeAll() {
        this.context.resume();
    }
} 