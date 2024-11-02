class InputManager {
    constructor() {
        this.keys = new Map();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseDelta = { x: 0, y: 0 };
        this.mouseButtons = new Map();
        this.mouseSensitivity = 0.002;
        this.isPointerLocked = false;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mouse events
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Pointer lock
        document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
    }

    handleKeyDown(event) {
        this.keys.set(event.code, true);
    }

    handleKeyUp(event) {
        this.keys.set(event.code, false);
    }

    handleMouseMove(event) {
        if (this.isPointerLocked) {
            this.mouseDelta.x = event.movementX * this.mouseSensitivity;
            this.mouseDelta.y = event.movementY * this.mouseSensitivity;
        } else {
            this.mousePosition.x = event.clientX;
            this.mousePosition.y = event.clientY;
        }
    }

    handleMouseDown(event) {
        this.mouseButtons.set(event.button, true);
        
        // Request pointer lock on canvas click
        const canvas = document.getElementById('game-canvas');
        if (event.target === canvas && !this.isPointerLocked) {
            canvas.requestPointerLock();
        }
    }

    handleMouseUp(event) {
        this.mouseButtons.set(event.button, false);
    }

    handlePointerLockChange() {
        this.isPointerLocked = document.pointerLockElement !== null;
    }

    isKeyPressed(keyCode) {
        return this.keys.get(keyCode) || false;
    }

    isMouseButtonPressed(button) {
        return this.mouseButtons.get(button) || false;
    }

    getMouseDelta() {
        const delta = { ...this.mouseDelta };
        // Reset delta after reading
        this.mouseDelta.x = 0;
        this.mouseDelta.y = 0;
        return delta;
    }

    update() {
        // Update any continuous input states here
    }

    // Movement helper methods
    isMovingForward() {
        return this.isKeyPressed('KeyW');
    }

    isMovingBackward() {
        return this.isKeyPressed('KeyS');
    }

    isMovingLeft() {
        return this.isKeyPressed('KeyA');
    }

    isMovingRight() {
        return this.isKeyPressed('KeyD');
    }

    isJumping() {
        return this.isKeyPressed('Space');
    }

    isCrouching() {
        return this.isKeyPressed('ControlLeft');
    }

    isReloading() {
        return this.isKeyPressed('KeyR');
    }

    isSprinting() {
        return this.isKeyPressed('ShiftLeft');
    }
} 