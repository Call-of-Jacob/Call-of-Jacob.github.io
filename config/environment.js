const environments = {
    development: {
        mongodb_uri: 'mongodb://localhost:27017/call-of-jacob',
        jwt_secret: 'dev_secret',
        port: 3000
    },
    production: {
        mongodb_uri: process.env.MONGODB_URI,
        jwt_secret: process.env.JWT_SECRET,
        port: process.env.PORT || 3000
    }
};

module.exports = environments[process.env.NODE_ENV || 'development']; 