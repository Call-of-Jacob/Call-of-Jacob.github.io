const config = {
    development: {
        apiUrl: 'http://localhost:3000',
        wsUrl: 'ws://localhost:3000',
        assetCdn: 'http://localhost:3000/assets',
        sentry: {
            dsn: '',
            environment: 'development'
        }
    },
    production: {
        apiUrl: 'https://your-backend.onrender.com',
        wsUrl: 'wss://your-backend.onrender.com',
        assetCdn: 'https://cdn.callofjacob.com/assets',
        sentry: {
            dsn: process.env.SENTRY_DSN,
            environment: 'production'
        },
        frontendUrl: 'https://yourusername.github.io/call-of-jacob'
    }
};

export default config[process.env.NODE_ENV || 'development']; 