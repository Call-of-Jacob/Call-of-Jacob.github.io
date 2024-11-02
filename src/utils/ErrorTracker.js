class ErrorTracker {
    constructor() {
        this.errors = [];
        this.setupGlobalErrorHandling();
    }

    setupGlobalErrorHandling() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.trackError(error);
        };

        window.addEventListener('unhandledrejection', (event) => {
            this.trackError(event.reason);
        });
    }

    trackError(error) {
        const errorData = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            gameState: game.getCurrentState()
        };

        this.errors.push(errorData);
        this.sendErrorToServer(errorData);
    }

    async sendErrorToServer(errorData) {
        try {
            await fetch('/api/errors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(errorData)
            });
        } catch (e) {
            console.error('Failed to send error to server:', e);
        }
    }
} 