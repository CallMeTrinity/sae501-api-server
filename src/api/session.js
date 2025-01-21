import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Récupérer une session ou toutes les sessions
router.get('/', async (req, res) => {
    try {
        const { id, code } = req.query;

        if (id) {
            const session = await prisma.sessions.findUnique({
                where: { id: parseInt(id) },
            });

            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }

            return res.status(200).json(session);
        }

        if (code) {
            const session = await prisma.sessions.findFirst({
                where: { code },
            });

            if (!session) {
                return res.status(404).json({ message: 'Session not found' });
            }

            return res.status(200).json(session);
        }

        const sessions = await prisma.sessions.findMany();
        return res.status(200).json(sessions);
    } catch (error) {
        console.error('Erreur lors de la récupération des sessions :', error);
        return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

// Créer une nouvelle session
router.post('/', async (req, res) => {
    try {
        const { code, playersNumber, status, hostId } = req.body;

        const session = await prisma.sessions.create({
            data: {
                code,
                playersNumber,
                status,
                hostId,
            },
        });

        return res.status(201).json(session);
    } catch (error) {
        console.error('Erreur lors de la création de la session :', error);
        return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

// Mettre à jour une session
router.put('/', async (req, res) => {
    try {
        const { id, code, playersNumber, status, hostId, questions, killerId, hints, killerType } = req.body;

        const existingSession = await prisma.sessions.findUnique({
            where: { id },
        });

        if (!existingSession) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const cleanData = (data) =>
            Object.fromEntries(Object.entries(data).filter(([_, value]) => value !== undefined));

        const updatedSession = await prisma.sessions.update({
            where: { id },
            data: cleanData({
                code,
                playersNumber,
                status,
                hostId,
                questions: questions ? JSON.stringify(questions) : undefined,
                killerId,
                hints,
                killerType,
            }),
        });

        return res.status(200).json(updatedSession);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la session :', error);
        return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

// Supprimer une session
router.delete('/', async (req, res) => {
    try {
        const { id } = req.query;

        const existingSession = await prisma.sessions.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existingSession) {
            return res.status(404).json({ message: 'Session not found' });
        }

        await prisma.sessions.delete({
            where: { id: parseInt(id) },
        });

        return res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la session :', error);
        return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

export default router;
