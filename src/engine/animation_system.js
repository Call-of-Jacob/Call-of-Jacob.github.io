class AnimationSystem {
    constructor() {
        this.animations = new Map();
        this.currentAnimation = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        this.transitionDuration = 0.5;
    }

    init(model) {
        this.mixer = new THREE.AnimationMixer(model);
        this.loadAnimations();
    }

    async loadAnimations() {
        const animationLoader = new THREE.FBXLoader();
        const animations = [
            { name: 'idle', path: '/assets/animations/idle.fbx' },
            { name: 'walk', path: '/assets/animations/walk.fbx' },
            { name: 'run', path: '/assets/animations/run.fbx' },
            { name: 'jump', path: '/assets/animations/jump.fbx' },
            { name: 'shoot', path: '/assets/animations/shoot.fbx' }
        ];

        for (const anim of animations) {
            try {
                const animData = await animationLoader.loadAsync(anim.path);
                this.animations.set(anim.name, animData.animations[0]);
            } catch (error) {
                console.error(`Failed to load animation: ${anim.name}`, error);
            }
        }
    }

    play(animationName, transitionDuration = this.transitionDuration) {
        if (!this.animations.has(animationName)) return;

        const nextAnim = this.mixer.clipAction(this.animations.get(animationName));
        const prevAnim = this.currentAnimation;

        if (prevAnim) {
            prevAnim.fadeOut(transitionDuration);
        }

        nextAnim.reset().fadeIn(transitionDuration).play();
        this.currentAnimation = nextAnim;
    }

    update() {
        if (this.mixer) {
            const delta = this.clock.getDelta();
            this.mixer.update(delta);
        }
    }

    dispose() {
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mixer.getRoot());
        }
        this.animations.clear();
        this.currentAnimation = null;
    }
}

export default new AnimationSystem(); 