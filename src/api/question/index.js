import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Récupérer les questions
router.get('/', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Récupérer les questions actives depuis la base
        const questions = await prisma.questions.findMany({
            where: { active: true },
        });

        if (!questions || questions.length === 0) {
            return res.status(404).json({ error: 'Aucune question disponible.' });
        }

        // Mélanger les questions et en limiter le nombre
        const shuffledQuestions = questions
            .sort(() => Math.random() - 0.5)
            .slice(0, parseInt(limit, 10));

        return res.status(200).json(shuffledQuestions);
    } catch (error) {
        console.error('Erreur lors de la récupération des questions :', error);
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
});

// Gérer les méthodes non supportées
router.all('*', (req, res) => {
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
});

export default router;
