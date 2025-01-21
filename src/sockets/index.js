import axios from 'axios';

export default function socketsHandler(io) {
    const sessions = {};
    const sessionTimerVote = {};
    const timerAlreadyEnd = {};

    // Fonction pour mélanger un tableau
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    io.on('connection', (socket) => {
        // Rejoindre une session
        socket.on('joinSession', async (sessionId, player) => {
            console.log(`${player.name} a rejoint la session ${sessionId}`);

            try {
                const response = await axios.get(`${process.env.API_URL}/session?id=${sessionId}`);
                const sessionData = response.data;
                console.log("(index.js:26) sessionData", sessionData);

                if (!sessionData.players?.find((p) => p.id === player.id)) {
                    sessionData.players?.push(player);

                    // Mettre à jour les joueurs dans la session via l'API
                    await axios.put(`${process.env.API_URL}/session?id=${sessionId}`, {
                        players: sessionData.players,
                    });
                }

                socket.join(sessionId);
                io.to(sessionId).emit('updatePlayers', sessionData.players);
            } catch (error) {
                console.error(`Erreur lors de la récupération ou mise à jour de la session ${sessionId}:`, error);
            }
        });

        // Démarrer une partie
        socket.on('startGame', (sessionId) => {
            console.log(`La partie dans la session ${sessionId} commence.`);
            io.to(sessionId).emit('gameStarted', '/role');
        });

        // Ajouter un indice
        socket.on('newHintAdded', async (sessionId) => {
            try {
                await axios.get(`${process.env.API_URL}/session?id=${sessionId}`);
                socket.to(sessionId).emit('refreshHints');
            } catch (error) {
                console.error("Erreur lors de l'émission de refreshHints :", error);
            }
        });

        // Lancer les questions
        socket.on('launchQuestion', async (sessionId) => {
            try {
                const response = await axios.get(`${process.env.API_URL}/session?id=${sessionId}`);
                const sessionData = response.data;

                const unansweredQuestions = await axios.get(`${process.env.API_URL}/question`, {
                    params: { notIn: sessionData.questions },
                });

                if (unansweredQuestions.data.length === 0) {
                    io.to(sessionId).emit('redirectToVote', { redirectUrl: '/vote' });
                    return;
                }

                const selectedQuestion = shuffle(unansweredQuestions.data)[0];
                const activePlayerIndex = sessionData.activePlayerIndex || 0;
                const activePlayer = sessionData.players[activePlayerIndex];

                io.to(sessionId).emit('nextQuestion', {
                    question: selectedQuestion,
                    activePlayer,
                });
            } catch (error) {
                console.error(`Erreur lors du lancement des questions pour la session ${sessionId}:`, error);
            }
        });

        // Soumission de la réponse
        socket.on('submitAnswer', async ({ sessionId, questionId, answer }) => {
            console.log(`Réponse reçue pour la question ${questionId}.`);

            try {
                const response = await axios.get(`${process.env.API_URL}/session?id=${sessionId}`);
                const sessionData = response.data;

                const currentIndex = sessionData.activePlayerIndex || 0;
                const newIndex = (currentIndex + 1) % sessionData.players.length;

                await axios.put(`${process.env.API_URL}/session?id=${sessionId}`, {
                    activePlayerIndex: newIndex,
                });

                io.to(sessionId).emit('answerSubmitted', {
                    redirectUrl: `/result?questionId=${encodeURIComponent(questionId)}&answer=${encodeURIComponent(answer)}`,
                });
            } catch (error) {
                console.error(`Erreur lors de la soumission de la réponse pour la session ${sessionId}:`, error);
            }
        });

        // Gestion des votes
        socket.on('voteForSuspect', async (suspectId, userId, sessionId) => {
            console.log(`Vote reçu : suspectId=${suspectId}, userId=${userId}, sessionId=${sessionId}`);
            try {
                await axios.post(`${process.env.API_URL}/votes`, {
                    sessionId,
                    userId,
                    suspectId,
                });

                const response = await axios.get(`${process.env.API_URL}/votes`, {
                    params: { sessionId },
                });

                io.to(sessionId).emit('voteSuccess', response.data);
            } catch (error) {
                console.error('Erreur lors de la gestion des votes :', error);
                io.to(socket.id).emit('voteError', 'Erreur interne lors du vote.');
            }
        });

        // Gestion du temps de vote
        socket.on('getVoteEndTime', (sessionId, timer) => {
            socket.join(sessionId);

            if (!sessionTimerVote[sessionId]) {
                sessionTimerVote[sessionId] = timer;
            }

            if (timerAlreadyEnd[sessionId]) {
                io.to(sessionId).emit('endVote', { message: 'Vote terminé.' });
                return;
            }

            let returnTimer = sessionTimerVote[sessionId];
            if (!sessions[sessionId]?.intervalId) {
                const intervalId = setInterval(() => {
                    if (returnTimer > 0) {
                        returnTimer -= 1;
                        sessionTimerVote[sessionId] = returnTimer;
                        io.to(sessionId).emit('VoteTime', { returnTimer });
                    } else {
                        clearInterval(intervalId);
                        timerAlreadyEnd[sessionId] = true;
                        io.to(sessionId).emit('endVote', { returnTimer: 0 });
                        if (sessions[sessionId]) {
                            delete sessions[sessionId].intervalId;
                        }
                    }
                }, 1000);

                sessions[sessionId] = sessions[sessionId] || {};
                sessions[sessionId].intervalId = intervalId;
            }
        });

        socket.on('endGame', (sessionId) => {
            io.to(sessionId).emit('gameEnded', '/endGame');
        });
    });
}
