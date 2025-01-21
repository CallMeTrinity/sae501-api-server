import { io } from "socket.io-client";

// Connexion au serveur Socket.IO
const socket = io("http://localhost:4000/", {
    path: "/api/socket", // Assurez-vous que le chemin est correct
    transports: ["websocket"], // Assurez-vous que le transport est configuré correctement
});

socket.on("connect", () => {
    console.log("Client connecté avec l'ID :", socket.id);

    // Tester `joinSession`
    socket.emit("joinSession", 999, { id: 999, name: "TEST-API" });

    // Écouter les mises à jour des joueurs
    socket.on("updatePlayers", (players) => {
        console.log("Mise à jour des joueurs :", players);
    });

    // Tester `startGame`
    setTimeout(() => {
        socket.emit("startGame", 999);
    }, 2000);

    // Écouter l'événement `gameStarted`
    socket.on("gameStarted", (redirectUrl) => {
        console.log("Partie démarrée, redirection :", redirectUrl);
    });

    // Écouter `nextQuestion`
    socket.on("nextQuestion", ({ question, activePlayer }) => {
        console.log("Nouvelle question :", question);
        console.log("Joueur actif :", activePlayer);
    });

    // Tester `submitAnswer`
    setTimeout(() => {
        socket.emit("submitAnswer", {
            sessionId: 999,
            questionId: 1,
            answer: "Réponse test",
        });
    }, 4000);

    // Écouter `answerSubmitted`
    socket.on("answerSubmitted", (data) => {
        console.log("Réponse soumise, redirection :", data.redirectUrl);
    });

    // Tester `voteForSuspect`
    setTimeout(() => {
        socket.emit("voteForSuspect", 2, 1, 999);
    }, 6000);

    // Écouter `voteSuccess`
    socket.on("voteSuccess", (votes) => {
        console.log("Votes mis à jour :", votes);
    });
});

// Gestion des déconnexions
socket.on("disconnect", () => {
    console.log("Client déconnecté.");
});

// Gestion des erreurs
socket.on("connect_error", (error) => {
    console.error("Erreur de connexion :", error.message);
});
