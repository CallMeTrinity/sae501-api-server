import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Récupérer les indices
router.get('/', async (req, res) => {
    try {
        const { suspectId, id } = req.query;

        if (suspectId && !id) {
            const suspectHints = await prisma.suspect_hints.findMany({
                where: { suspectId: parseInt(suspectId) },
            });
            return res.status(200).json(suspectHints);
        }

        if (suspectId && id) {
            const suspectHint = await prisma.suspect_hints.findFirst({
                where: {
                    suspectId: parseInt(suspectId),
                    id: parseInt(id),
                },
                include: { Suspects: true },
            });
            return res.status(200).json(suspectHint);
        }

        const suspectHints = await prisma.suspect_hints.findMany();
        return res.status(200).json(suspectHints);
    } catch (error) {
        console.error('Erreur lors de la récupération des indices :', error);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Créer un nouvel indice
router.post('/', async (req, res) => {
    try {
        const { suspectId, hintText } = req.body;

        if (!suspectId || !hintText) {
            return res.status(400).json({ message: 'Invalid data: suspectId and hintText are required.' });
        }

        const suspectHint = await prisma.suspect_hints.create({
            data: { suspectId: parseInt(suspectId), hintText },
        });

        return res.status(201).json(suspectHint);
    } catch (error) {
        console.error('Erreur lors de la création de l\'indice :', error);
        return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Gérer les méthodes non supportées
router.all('*', (req, res) => {
    return res.status(405).json({ message: 'Method Not Allowed' });
});

export default router;
