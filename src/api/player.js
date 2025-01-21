import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Récupérer un ou plusieurs joueurs
router.get('/', async (req, res) => {
    try {
        const { id, sessionId } = req.query;

        if (id) {
            const player = await prisma.players.findUnique({
                where: { id: parseInt(id) },
            });

            if (!player) {
                return res.status(404).json({ message: 'Player not found' });
            }

            return res.status(200).json(player);
        }

        if (sessionId) {
            const players = await prisma.players.findMany({
                where: { sessionId: parseInt(sessionId) },
            });

            if (players.length === 0) {
                return res.status(404).json({ message: 'No players found for this session' });
            }

            return res.status(200).json(players);
        }

        const players = await prisma.players.findMany();
        return res.status(200).json(players);
    } catch (error) {
        console.error('Erreur lors de la récupération des joueurs:', error);
        return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

// Créer un joueur
router.post('/', async (req, res) => {
    try {
        const { name, skin } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Le pseudo est obligatoire.' });
        }

        if (!skin || skin <= 0) {
            return res.status(400).json({ message: 'Un skin valide est obligatoire (id > 0).' });
        }

        const player = await prisma.players.create({
            data: {
                name: name.trim(),
                skin: skin,
            },
        });

        return res.status(201).json(player);
    } catch (error) {
        console.error('Erreur lors de la création du joueur:', error);
        return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

// Mettre à jour un joueur
router.put('/', async (req, res) => {
    try {
        const { id, sessionId, name, role, score, gameData } = req.body;

        const existingPlayer = await prisma.players.findUnique({
            where: { id },
        });

        if (!existingPlayer) {
            return res.status(404).json({ message: 'Player not found' });
        }

        const updatedPlayer = await prisma.players.update({
            where: { id },
            data: {
                sessionId: sessionId ?? undefined,
                name: name ?? undefined,
                role: role ?? undefined,
                score: score ?? undefined,
                gameData: gameData ?? undefined,
            },
        });

        return res.status(200).json(updatedPlayer);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du joueur:', error);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour du joueur' });
    }
});

// Supprimer un joueur
router.delete('/', async (req, res) => {
    try {
        const { id } = req.query;

        const existingPlayer = await prisma.players.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existingPlayer) {
            return res.status(404).json({ message: 'Player not found' });
        }

        await prisma.players.delete({
            where: { id: parseInt(id) },
        });

        return res.status(200).json({ message: 'Player deleted successfully' });
    } catch (error) {
        console.error('Erreur lors de la suppression du joueur:', error);
        return res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

export default router;
