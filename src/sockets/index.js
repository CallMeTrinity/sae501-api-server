export default function initSockets(io) {
    const sessions = {};

    io.on('connection', (socket) => {
        console.log('New WebSocket connection');

        socket.on('joinSession', (sessionId, player) => {
            if (!sessions[sessionId]) {
                sessions[sessionId] = { players: [] };
            }
            sessions[sessionId].players.push(player);
            socket.join(sessionId);
            io.to(sessionId).emit('updatePlayers', sessions[sessionId].players);
        });

        socket.on('startGame', (sessionId) => {
            io.to(sessionId).emit('gameStarted');
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
}
