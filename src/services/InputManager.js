class InputManager {
    constructor() {
        this.keys = new Map();
        this.mousePosition = { x: 0, y: 0 };
        this.mouseDelta = { x: 0, y: 0 };
        this.mouseButtons = new Map();
        this.mouseSensitivity = 0.002;
        this.isPointerLocked = false;
        this.bindings = new Map();

        this.setupDefaultBindings();
        this.setupEventListeners();
    }

    setupDefaultBindings() {
        this.bindings.set('moveForward', 'KeyW');
        this.bindings.set('moveBackward', 'KeyS');
        this.bindings.set('moveLeft', 'KeyA');
        this.bindings.set('moveRight', 'KeyD');
        this.bindings.set('jump', 'Space');
        this.bindings.set('crouch', 'KeyC');
        this.bindings.set('sprint', 'ShiftLeft');
        this.bindings.set('reload', 'KeyR');
        this.bindings.set('interact', 'KeyE');
        this.bindings.set('weaponPrimary', 'Digit1');
        this.bindings.set('weaponSecondary', 'Digit2');
        this.bindings.set('melee', 'KeyV');
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
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

    isActionPressed(action) {
        const binding = this.bindings.get(action);
        return this.keys.get(binding) || false;
    }

    isMouseButtonPressed(button) {
        return this.mouseButtons.get(button) || false;
    }

    getMouseDelta() {
        const delta = { ...this.mouseDelta };
        this.mouseDelta = { x: 0, y: 0 };
        return delta;
    }

    rebindAction(action, newKey) {
        if (this.bindings.has(action)) {
            this.bindings.set(action, newKey);
            return true;
        }
        return false;
    }

    getBindings() {
        return new Map(this.bindings);
    }

    resetBindings() {
        this.setupDefaultBindings();
    }
}

export default new InputManager(); 