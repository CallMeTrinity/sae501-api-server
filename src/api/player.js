import express from 'express';
const router = express.Router();

router.get('/', async (req, res) => {
    const players = await req.prisma.players.findMany();
    res.json(players);
});

router.post('/', async (req, res) => {
    const player = await req.prisma.players.create({ data: req.body });
    res.status(201).json(player);
});

export default router;
