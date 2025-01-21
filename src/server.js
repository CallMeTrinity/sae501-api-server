import express from 'express';
import http from 'http';
import {Server as SocketServer} from 'socket.io';
import prisma from 'prisma';
import initSockets from './sockets/index.js';
import playerRoutes from './api/player.js';
import sessionRoutes from './api/session.js';
import suspectRoutes from './api/suspect.js';
import suspect_hints from "./api/suspect_hints.js";
import questionRoutes from './api/question/index.js';
import answerRoutes from './api/question/answer.js';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
    path: '/api/socket',
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
// Middleware
app.use(express.json());
require('dotenv').config();
app.use((req, res, next) => {
    req.prisma = prisma;
    next();
});

// Routes
app.use('/api/player', playerRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/suspect', suspectRoutes);
app.use('/api/suspect_hints', suspect_hints);
app.use('/api/question', questionRoutes);
app.use('/api/answer', answerRoutes);

// WebSocket
initSockets(io);

// Start the server
const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
