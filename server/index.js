const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cors = require('cors');

const config = require('../config/environment');
const securityMiddleware = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const { DatabaseBackup } = require('../utils/DatabaseBackup');
const { Monitoring } = require('../utils/Monitoring');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// MongoDB setup
const mongoClient = new MongoClient(process.env.MONGODB_URI);
let db;

async function initializeServer() {
    try {
        await mongoClient.connect();
        db = mongoClient.db('call-of-jacob');
        console.log('Connected to MongoDB');

        // Start server
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to connect to MongoDB:', err);
        process.exit(1);
    }
}

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// API routes
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Game state handling
const gameStates = new Map();
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join_game', async (data) => {
        // Handle player joining game
    });

    socket.on('player_update', (data) => {
        // Handle player state updates
    });

    socket.on('game_event', (data) => {
        // Handle game events
    });

    socket.on('disconnect', () => {
        // Handle player disconnect
    });
});

initializeServer(); 