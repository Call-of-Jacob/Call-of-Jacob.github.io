class StateReconciliation {
    constructor() {
        this.serverStates = [];
        this.pendingInputs = [];
        this.lastProcessedInput = 0;
        this.serverDelay = 100; // ms
        this.maxServerStates = 60;
    }

    applyInput(input) {
        // Apply input locally for immediate feedback
        this.applyInputToLocalState(input);

        // Save input for reconciliation
        input.sequence = ++this.lastProcessedInput;
        this.pendingInputs.push(input);

        // Send to server
        game.networkManager.sendInput(input);
    }

    receiveServerState(state) {
        // Add server state to buffer
        this.serverStates.push({
            timestamp: Date.now(),
            state: state
        });

        // Keep buffer size in check
        while (this.serverStates.length > this.maxServerStates) {
            this.serverStates.shift();
        }

        // Reconcile with server state
        this.reconcileState(state);
    }

    reconcileState(serverState) {
        // Remove old inputs
        this.pendingInputs = this.pendingInputs.filter(
            input => input.sequence > serverState.lastProcessedInput
        );

        // Reset to server state
        this.resetToServerState(serverState);

        // Reapply pending inputs
        for (const input of this.pendingInputs) {
            this.applyInputToLocalState(input);
        }
    }

    getInterpolatedState(renderTimestamp) {
        if (this.serverStates.length < 2) return null;

        // Find two states to interpolate between
        const renderTime = renderTimestamp - this.serverDelay;
        let previousState = this.serverStates[0];
        let nextState = this.serverStates[1];

        for (let i = 1; i < this.serverStates.length; i++) {
            if (this.serverStates[i].timestamp > renderTime) {
                previousState = this.serverStates[i - 1];
                nextState = this.serverStates[i];
                break;
            }
        }

        // Calculate interpolation factor
        const alpha = (renderTime - previousState.timestamp) / 
                     (nextState.timestamp - previousState.timestamp);

        // Interpolate between states
        return this.interpolateStates(previousState.state, nextState.state, alpha);
    }

    interpolateStates(previous, next, alpha) {
        return {
            position: {
                x: previous.position.x + (next.position.x - previous.position.x) * alpha,
                y: previous.position.y + (next.position.y - previous.position.y) * alpha,
                z: previous.position.z + (next.position.z - previous.position.z) * alpha
            },
            rotation: {
                x: previous.rotation.x + (next.rotation.x - previous.rotation.x) * alpha,
                y: previous.rotation.y + (next.rotation.y - previous.rotation.y) * alpha,
                z: previous.rotation.z + (next.rotation.z - previous.rotation.z) * alpha
            }
        };
    }

    applyInputToLocalState(input) {
        // Apply movement
        const speed = 5;
        if (input.forward) game.player.position.z += speed;
        if (input.backward) game.player.position.z -= speed;
        if (input.left) game.player.position.x -= speed;
        if (input.right) game.player.position.x += speed;

        // Apply rotation
        if (input.mouseX) {
            game.player.rotation.y += input.mouseX * 0.002;
        }
        if (input.mouseY) {
            game.player.rotation.x += input.mouseY * 0.002;
        }

        // Apply actions
        if (input.jump && game.player.canJump) {
            game.player.velocity.y = 10;
        }
        if (input.shoot) {
            game.player.shoot();
        }
    }

    resetToServerState(state) {
        game.player.position = { ...state.position };
        game.player.rotation = { ...state.rotation };
        game.player.health = state.health;
        game.player.velocity = { ...state.velocity };
    }
}

export default new StateReconciliation(); 