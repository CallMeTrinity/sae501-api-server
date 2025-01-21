import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Normalisation de la chaîne pour les comparaisons
const normalizeString = (str) =>
    str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

// Valider une réponse
router.post('/', async (req, res) => {
    try {
        const { id, answer } = req.body;

        if (!id || !answer) {
            return res.status(400).json({ message: "Les champs 'id' et 'answer' sont obligatoires." });
        }

        // Récupérer la question depuis la base de données
        const question = await prisma.questions.findUnique({
            where: { id: parseInt(id) },
        });

        if (!question) {
            return res.status(404).json({ message: "Question non trouvée." });
        }

        // Comparer la réponse utilisateur à la solution
        const userAnswer = normalizeString(answer);
        const correctAnswer = normalizeString(question.solution) === userAnswer;

        if (correctAnswer) {
            return res.status(200).json({
                correct: true,
                message: JSON.parse(question.feedback)?.correct || "Bonne réponse !",
            });
        } else {
            return res.status(200).json({
                correct: false,
                message: JSON.parse(question.feedback)?.incorrect || "Mauvaise réponse, essayez encore.",
            });
        }
    } catch (error) {
        console.error("Erreur lors du traitement de la réponse :", error);
        return res.status(500).json({ message: "Erreur interne du serveur." });
    }
});

// Gérer les méthodes non supportées
router.all('*', (req, res) => {
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
});

export default router;
