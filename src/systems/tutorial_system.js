class TutorialSystem {
    constructor() {
        this.steps = new Map();
        this.currentStep = null;
        this.completed = new Set();
        this.initializeTutorials();
    }

    initializeTutorials() {
        this.addTutorial('movement', [
            {
                id: 'basic_movement',
                message: 'Use WASD to move',
                condition: player => player.hasMovedDistance > 5
            },
            {
                id: 'sprint',
                message: 'Hold Shift to sprint',
                condition: player => player.hasSprinted
            },
            {
                id: 'crouch',
                message: 'Press C to crouch',
                condition: player => player.hasCrouched
            }
        ]);

        this.addTutorial('combat', [
            {
                id: 'aim',
                message: 'Right-click to aim',
                condition: player => player.hasAimed
            },
            {
                id: 'shoot',
                message: 'Left-click to shoot',
                condition: player => player.hasShot
            },
            {
                id: 'reload',
                message: 'Press R to reload',
                condition: player => player.hasReloaded
            }
        ]);
    }

    addTutorial(name, steps) {
        this.steps.set(name, steps);
    }

    startTutorial(name) {
        const steps = this.steps.get(name);
        if (!steps) return;
        
        this.currentStep = steps[0];
        this.showTutorialUI(this.currentStep);
    }

    update(player) {
        if (!this.currentStep) return;
        
        if (this.currentStep.condition(player)) {
            this.completed.add(this.currentStep.id);
            this.nextStep();
        }
    }

    nextStep() {
        const currentTutorial = Array.from(this.steps.values())
            .find(steps => steps.includes(this.currentStep));
            
        const currentIndex = currentTutorial.indexOf(this.currentStep);
        this.currentStep = currentTutorial[currentIndex + 1];
        
        if (this.currentStep) {
            this.showTutorialUI(this.currentStep);
        }
    }

    showTutorialUI(step) {
        // Implement UI display
    }
} 