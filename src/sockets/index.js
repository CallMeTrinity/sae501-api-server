import {encryptParam} from '../utils/cryptoUtils.js';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

// Stores en mémoire
const sessions = {};
const sessionVote = {};
const sessionTimerVote = {};
const timerAlreadyEnd = {};

// Fonction pour mélanger les tableaux
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export default function initSocket(io) {
    console.log('Initialisation du serveur Socket.IO...');

    io.on('connection', (socket) => {
        console.log('Nouvelle connexion établie :', socket.id);

        // Rejoindre une session
        socket.on('joinSession', async (sessionId, player) => {
            console.log(`${player.name} a rejoint la session ${sessionId}`);
            if (!sessions[sessionId]) {
                sessions[sessionId] = {
                    players: [],
                    questions: [],
                    answered: false,
                    activePlayerIndex: 0,
                };
            }

            const existingPlayer = sessions[sessionId].players.find((p) => p.id === player.id);
            if (!existingPlayer) {
                sessions[sessionId].players.push(player);
            }
            socket.join(sessionId);
            io.to(sessionId).emit('updatePlayers', sessions[sessionId].players);
        });

        socket.on('answerResult', (data) => {
            io.to(data.sessionId).emit('answerResult', {
                correct: data.correct,
                feedback: data.feedback,
            });
        });

        // Démarrer une partie
        socket.on('startGame', (sessionId) => {
            console.log(`La partie dans la session ${sessionId} commence.`);
            io.to(sessionId).emit('gameStarted', '/role');
        });

        socket.on('newHintAdded', async (sessionId) => {
            try {
                await prisma.sessions.findUnique({ where: { id: parseInt(sessionId) } });
                socket.to(sessionId).emit('refreshHints');
            } catch (error) {
                console.error('Erreur lors de l\'émission de refreshHints :', error);
            }
        });

        // Lancer une question
        socket.on('launchQuestion', async (sessionId) => {
            if (!sessions[sessionId]) {
                console.error(`Session ${sessionId} introuvable.`);
                return;
            }

            const answeredQuestions = await prisma.sessions.findUnique({
                where: { id: parseInt(sessionId) },
                select: { questions: true },
            });
            const answeredList = JSON.parse(answeredQuestions.questions)?.map(Number) || [];

            let selectedQuestion = null;
            // Adapte le 10 selon le nombre de questions max
            if (answeredList.length < 10) {
                const questions = await prisma.questions.findMany({
                    where: {
                        id: { notIn: answeredList },
                        active: true,
                    },
                });
                if (questions.length === 0) {
                    console.error('Aucune question disponible.');
                    io.to(sessionId).emit('redirectToVote', { redirectUrl: '/vote' });
                    return;
                }
                selectedQuestion = shuffle(questions)[0];
            } else {
                io.to(sessionId).emit('redirectToVote', { redirectUrl: '/vote' });
                return;
            }

            const activePlayerIndex = sessions[sessionId].activePlayerIndex || 0;
            const activePlayer = sessions[sessionId].players[activePlayerIndex];

            io.to(sessionId).emit('nextQuestion', {
                question: selectedQuestion,
                activePlayer,
            });
        });

        // Soumission de la réponse
        socket.on('submitAnswer', async ({ sessionId, questionId, answer }) => {
            console.log(`Réponse reçue pour la question ${questionId}: ${answer}`);

            const sessionData = sessions[sessionId];
            if (!sessionData) {
                console.error(`Session ${sessionId} introuvable.`);
                return;
            }

            // Mettre à jour l'index du joueur actif
            const currentIndex = sessionData.activePlayerIndex || 0;
            const newIndex = (currentIndex + 1) % sessionData.players.length;
            try {
                await prisma.sessions.update({
                    where: { id: parseInt(sessionId) },
                    data: { activePlayerIndex: newIndex },
                });
                sessionData.activePlayerIndex = newIndex;
            } catch (error) {
                console.error('Erreur lors de la mise à jour de l’index du joueur actif :', error);
            }

            sessionData.answered = true;

            const encryptedQuestionId = encryptParam(questionId);
            const encryptedAnswer = encryptParam(answer);

            io.to(sessionId).emit('answerSubmitted', {
                redirectUrl: `/result?questionId=${encodeURIComponent(encryptedQuestionId)}&answer=${encodeURIComponent(encryptedAnswer)}`,
            });
        });

        socket.on('nextQuestion', (sessionId) => {
            io.to(sessionId).emit('redirectToEnigma');
        });

        socket.on('setNextPlayer', (sessionId) => {
            const sessionData = sessions[sessionId];
            if (!sessionData) return;
            const nbPlayers = sessionData.players.length;
            sessionData.activePlayerIndex = (sessionData.activePlayerIndex + 1) % nbPlayers;
            console.log(`Prochain joueur: index = ${sessionData.activePlayerIndex}`);
        });

        socket.on('voteForSuspect', (suspectId, userId, sessionId) => {
            console.log(`suspectId ${suspectId} : userId = ${userId} - sessionId = ${sessionId}`);

            if (!suspectId || !userId || !sessionId) {
                console.error('Données invalides reçues pour le vote.');
                io.to(socket.id).emit('voteError', 'Données invalides pour le vote.');
                return;
            }

            if (!sessions[sessionId]) {
                console.error(`Session ${sessionId} introuvable.`);
                io.to(socket.id).emit('voteError', 'Session introuvable.');
                return;
            }

            if (!sessionVote[sessionId]) {
                sessionVote[sessionId] = [];
            }

            // Vérification du temps de vote
            const now = new Date();
            const sessionEndTime = sessions[sessionId]?.endTime;
            if (sessionEndTime && new Date(sessionEndTime) <= now) {
                io.to(socket.id).emit('voteError', 'Le temps de vote est écoulé.');
                return;
            }

            const voteIndex = sessionVote[sessionId].findIndex(v => v.userId === userId);

            if (voteIndex !== -1) {
                if (sessionVote[sessionId][voteIndex].suspectId === suspectId) {
                    console.log(`Le joueur ${userId} a déjà voté pour ${suspectId}`);
                    io.to(socket.id).emit('voteError', 'Vous avez déjà voté pour ce suspect.');
                } else {
                    sessionVote[sessionId][voteIndex].suspectId = suspectId;
                    console.log(`Le joueur ${userId} a changé son vote pour ${suspectId}.`);
                }
            } else {
                sessionVote[sessionId].push({ userId, suspectId });
                console.log(`Le joueur ${userId} a voté pour le suspect ${suspectId}.`);
            }

            console.log(`Mise à jour des votes pour la session ${sessionId} :`, sessionVote[sessionId]);
            socket.join(sessionId);
            io.to(sessionId).emit('voteSuccess', sessionVote[sessionId]);
        });

        socket.on('getSessionVote', (sessionId) => {
            console.log(`Envoyer ${sessionVote[sessionId]} à sessionId = ${sessionId}`);
            socket.join(sessionId);
            io.to(sessionId).emit('allVotes', sessionVote[sessionId]);
        });

        socket.on('getVoteEndTime', (sessionId, timer) => {
            socket.join(sessionId);
            if (!sessionTimerVote[sessionId]) {
                sessionTimerVote[sessionId] = timer;
            }
            if (timerAlreadyEnd[sessionId] === true) {
                io.to(sessionId).emit('endVote', { message: 'vote fini' });
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

                if (!sessions[sessionId]) {
                    sessions[sessionId] = {};
                }
                sessions[sessionId].intervalId = intervalId;
            }
        });

        socket.on('answerResultRightSolution', (data) => {
            io.to(data.sessionId).emit('answerResultRightSolution', {
                questionId: data.questionId,
                rightSolution: data.rightSolution,
            });
        });

        socket.on('startVote', (sessionId, durationInSeconds) => {
            const now = new Date();
            const endTime = new Date(now.getTime() + durationInSeconds * 1000);
            if (!sessions[sessionId]) {
                sessions[sessionId] = {};
            }
            sessions[sessionId].endTime = endTime;
            io.to(sessionId).emit('voteStart', { endTime });
        });

        socket.on('endGame', (sessionId, votes) => {
            const encryptVotes = encryptParam(votes);
            io.to(sessionId).emit('gameEnded', `/endGame?votes=${encryptVotes}`);
        });

        socket.on('endGameButton', (sessionId, votes) => {
            const encryptVotes = encryptParam(votes);
            io.to(sessionId).emit('gameEndedButton', `/endGame?votes=${encryptVotes}`);
        });
    });

    return io;
}
