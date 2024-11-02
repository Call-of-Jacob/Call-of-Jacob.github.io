const winston = require('winston');
const Sentry = require('@sentry/node');
const { MongoClient } = require('mongodb');

class Monitoring {
    constructor() {
        this.initializeSentry();
        this.initializeLogger();
        this.initializeMetrics();
        this.startHeartbeat();
    }

    initializeSentry() {
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            environment: process.env.NODE_ENV,
            tracesSampleRate: 1.0,
        });
    }

    initializeLogger() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/combined.log' })
            ]
        });

        if (process.env.NODE_ENV !== 'production') {
            this.logger.add(new winston.transports.Console({
                format: winston.format.simple()
            }));
        }
    }

    initializeMetrics() {
        this.metrics = {
            activeUsers: 0,
            matchesInProgress: 0,
            serverLoad: 0,
            latency: new Map(),
            errors: new Map()
        };
    }

    startHeartbeat() {
        setInterval(() => this.checkHealth(), 30000);
    }

    async checkHealth() {
        try {
            const health = await this.getSystemHealth();
            this.logger.info('Health check', { health });
            
            if (health.status !== 'healthy') {
                Sentry.captureMessage('System health degraded', {
                    level: 'warning',
                    extra: health
                });
            }
        } catch (error) {
            this.logger.error('Health check failed', { error });
            Sentry.captureException(error);
        }
    }

    async getSystemHealth() {
        const health = {
            status: 'healthy',
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            memory: process.memoryUsage(),
            uptime: process.uptime()
        };

        try {
            await this.checkDatabaseConnection();
            health.database = 'connected';
        } catch (error) {
            health.status = 'degraded';
            health.database = 'disconnected';
        }

        return health;
    }

    async checkDatabaseConnection() {
        const client = new MongoClient(process.env.MONGODB_URI);
        try {
            await client.connect();
            await client.db('admin').command({ ping: 1 });
            return true;
        } finally {
            await client.close();
        }
    }

    logError(error, context = {}) {
        this.logger.error('Application error', {
            error: error.message,
            stack: error.stack,
            ...context
        });

        Sentry.captureException(error, {
            extra: context
        });

        // Update error metrics
        const errorType = error.name || 'UnknownError';
        this.metrics.errors.set(errorType, 
            (this.metrics.errors.get(errorType) || 0) + 1
        );
    }

    logMetric(name, value, tags = {}) {
        this.logger.info('Metric', {
            metric: name,
            value,
            tags
        });
    }

    updateUserMetrics(activeUsers) {
        this.metrics.activeUsers = activeUsers;
        this.logMetric('active_users', activeUsers);
    }

    recordLatency(userId, latency) {
        this.metrics.latency.set(userId, latency);
        this.logMetric('user_latency', latency, { userId });
    }
}

module.exports = new Monitoring(); 