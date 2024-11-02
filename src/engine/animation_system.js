class Animation {
    constructor(name, frames, duration, loop = true) {
        this.name = name;
        this.frames = frames;
        this.duration = duration;
        this.loop = loop;
        this.currentTime = 0;
        this.currentFrame = 0;
        this.isPlaying = false;
        this.onComplete = null;
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        this.currentTime += deltaTime;
        const frameTime = this.duration / this.frames.length;
        this.currentFrame = Math.floor((this.currentTime / this.duration) * this.frames.length);

        if (this.currentTime >= this.duration) {
            if (this.loop) {
                this.currentTime = 0;
                this.currentFrame = 0;
            } else {
                this.isPlaying = false;
                if (this.onComplete) this.onComplete();
            }
        }
    }

    play() {
        this.isPlaying = true;
        this.currentTime = 0;
        this.currentFrame = 0;
    }

    pause() {
        this.isPlaying = false;
    }

    reset() {
        this.currentTime = 0;
        this.currentFrame = 0;
        this.isPlaying = false;
    }

    getCurrentFrame() {
        return this.frames[this.currentFrame];
    }
}

class AnimationState {
    constructor() {
        this.animations = new Map();
        this.currentAnimation = null;
        this.blendTime = 0.2; // seconds
        this.currentBlend = 0;
        this.previousAnimation = null;
    }

    addAnimation(name, animation) {
        this.animations.set(name, animation);
    }

    play(name, resetIfSame = false) {
        if (!this.animations.has(name)) return;

        if (this.currentAnimation && this.currentAnimation.name === name && !resetIfSame) {
            return;
        }

        const newAnimation = this.animations.get(name);
        
        if (this.currentAnimation) {
            this.previousAnimation = this.currentAnimation;
            this.currentBlend = 0;
        }

        this.currentAnimation = newAnimation;
        this.currentAnimation.play();
    }

    update(deltaTime) {
        if (this.previousAnimation && this.currentBlend < this.blendTime) {
            this.currentBlend += deltaTime;
            this.previousAnimation.update(deltaTime);
        }

        if (this.currentAnimation) {
            this.currentAnimation.update(deltaTime);
        }
    }

    getCurrentFrame() {
        if (!this.currentAnimation) return null;

        if (this.previousAnimation && this.currentBlend < this.blendTime) {
            const blend = this.currentBlend / this.blendTime;
            return this.blendFrames(
                this.previousAnimation.getCurrentFrame(),
                this.currentAnimation.getCurrentFrame(),
                blend
            );
        }

        return this.currentAnimation.getCurrentFrame();
    }

    blendFrames(frameA, frameB, blend) {
        // Interpolate between two animation frames
        return {
            position: this.interpolateVectors(frameA.position, frameB.position, blend),
            rotation: this.interpolateQuaternions(frameA.rotation, frameB.rotation, blend),
            scale: this.interpolateVectors(frameA.scale, frameB.scale, blend)
        };
    }

    interpolateVectors(a, b, t) {
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t
        };
    }

    interpolateQuaternions(a, b, t) {
        // Simple quaternion interpolation (SLERP would be better for production)
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t,
            z: a.z + (b.z - a.z) * t,
            w: a.w + (b.w - a.w) * t
        };
    }
}

class AnimationSystem {
    constructor() {
        this.animationStates = new Map();
        this.loadedAnimations = new Map();
    }

    loadAnimation(name, data) {
        const frames = this.processAnimationData(data);
        const animation = new Animation(name, frames, data.duration, data.loop);
        this.loadedAnimations.set(name, animation);
    }

    createAnimationState(entityId) {
        const state = new AnimationState();
        this.animationStates.set(entityId, state);
        return state;
    }

    getAnimationState(entityId) {
        return this.animationStates.get(entityId);
    }

    update(deltaTime) {
        for (const state of this.animationStates.values()) {
            state.update(deltaTime);
        }
    }

    processAnimationData(data) {
        // Convert raw animation data into usable frames
        return data.frames.map(frame => ({
            position: frame.position,
            rotation: frame.rotation,
            scale: frame.scale,
            joints: frame.joints // For skeletal animations
        }));
    }

    // Animation presets for common actions
    playWalkAnimation(entityId) {
        const state = this.getAnimationState(entityId);
        if (state) state.play('walk');
    }

    playCrouchAnimation(entityId) {
        const state = this.getAnimationState(entityId);
        if (state) state.play('crouch');
    }

    playShootAnimation(entityId) {
        const state = this.getAnimationState(entityId);
        if (state) {
            state.play('shoot', true); // Always reset shooting animation
        }
    }

    playReloadAnimation(entityId) {
        const state = this.getAnimationState(entityId);
        if (state) {
            const reloadAnim = this.loadedAnimations.get('reload');
            if (reloadAnim) {
                reloadAnim.onComplete = () => {
                    state.play('idle');
                };
                state.play('reload');
            }
        }
    }
} 