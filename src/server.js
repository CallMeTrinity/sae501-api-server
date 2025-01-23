import express from 'express';
import http from 'http';
import cors from 'cors'; // Import du middleware CORS
import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import initSockets from './sockets/index.js';
import playerRoutes from './api/player.js';
import sessionRoutes from './api/session.js';
import suspectRoutes from './api/suspect.js';
import suspect_hints from './api/suspect_hints.js';
import questionRoutes from './api/question/index.js';
import answerRoutes from './api/question/answer.js';
import dotenv from 'dotenv';

const app = express();
const prisma = new PrismaClient();
const server = http.createServer(app);
const io = new SocketServer(server, {
    path: '/api/socket',
    cors: {
        origin: '*', // Autorise toutes les origines pour les WebSockets
        methods: ['GET', 'POST'], // Autorise ces méthodes
    },
});

// Charger les variables d'environnement
dotenv.config();

// Middleware
app.use(cors());
app.use(express.json());

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
const PORT = process.env.PORT || 34003;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
