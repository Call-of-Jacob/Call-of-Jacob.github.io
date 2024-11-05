class Logger {
    constructor() {
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        this.currentLevel = this.logLevels.INFO;
    }

    error(message, error = null) {
        if (this.currentLevel >= this.logLevels.ERROR) {
            console.error(`[ERROR] ${message}`, error);
            // Send to error tracking service
            ErrorTracker.trackError(error || new Error(message));
        }
    }

    warn(message, data = null) {
        if (this.currentLevel >= this.logLevels.WARN) {
            console.warn(`[WARN] ${message}`, data);
        }
    }

    info(message, data = null) {
        if (this.currentLevel >= this.logLevels.INFO) {
            console.info(`[INFO] ${message}`, data);
        }
    }

    debug(message, data = null) {
        if (this.currentLevel >= this.logLevels.DEBUG) {
            console.debug(`[DEBUG] ${message}`, data);
        }
    }

    setLevel(level) {
        this.currentLevel = level;
    }
}

export default new Logger(); 