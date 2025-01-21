import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// Récupérer un ou plusieurs suspects
router.get('/', async (req, res) => {
    try {
        const { id, killerType } = req.query;

        if (id) {
            const suspect = await prisma.suspects.findUnique({
                where: { id: parseInt(id) },
            });

            if (!suspect) {
                return res.status(404).json({ message: 'No suspect found with this ID.' });
            }

            return res.status(200).json(suspect);
        }

        if (killerType) {
            const suspects = await prisma.suspects.findMany({
                where: { killerType: parseInt(killerType) },
            });

            if (!suspects || suspects.length === 0) {
                return res.status(404).json({ message: 'No suspects found for this killerType.' });
            }

            return res.status(200).json(suspects);
        }

        const suspects = await prisma.suspects.findMany();
        return res.status(200).json(suspects);
    } catch (error) {
        console.error('Error retrieving suspects:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Créer un nouveau suspect
router.post('/', async (req, res) => {
    try {
        const { name, description, hints } = req.body;

        const suspect = await prisma.suspects.create({
            data: {
                name,
                description,
                hints,
            },
        });

        return res.status(201).json(suspect);
    } catch (error) {
        console.error('Error creating suspect:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Mettre à jour un suspect
router.put('/', async (req, res) => {
    try {
        const { id, name, description, hints } = req.body;

        const existingSuspect = await prisma.suspects.findUnique({
            where: { id },
        });

        if (!existingSuspect) {
            return res.status(404).json({ message: 'Suspect not found' });
        }

        const updatedSuspect = await prisma.suspects.update({
            where: { id },
            data: {
                name,
                description,
                hints,
            },
        });

        return res.status(200).json(updatedSuspect);
    } catch (error) {
        console.error('Error updating suspect:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// Supprimer un suspect
router.delete('/', async (req, res) => {
    try {
        const { id } = req.query;

        const existingSuspect = await prisma.suspects.findUnique({
            where: { id: parseInt(id) },
        });

        if (!existingSuspect) {
            return res.status(404).json({ message: 'Suspect not found' });
        }

        await prisma.suspects.delete({
            where: { id: parseInt(id) },
        });

        return res.status(200).json({ message: 'Suspect deleted successfully' });
    } catch (error) {
        console.error('Error deleting suspect:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

export default router;
