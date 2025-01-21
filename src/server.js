import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import prisma from 'prisma';
import initSockets from './sockets';
import playerRoutes from './api/player';
import sessionRoutes from './api/session';
import suspectRoutes from './api/suspect';
import questionRoutes from './api/question';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

// Middleware
app.use(express.json());
app.use((req, res, next) => { req.prisma = prisma; next(); });

// Routes
app.use('/api/player', playerRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/suspect', suspectRoutes);
app.use('/api/question', questionRoutes);

// WebSocket
initSockets(io);

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
