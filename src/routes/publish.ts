import { Router } from 'express';
import broadcaster from "../services/index.js";

const router = Router();

router.post('/', (req, res) => {
    req.on('data', (chunk: Buffer) => {
        broadcaster.publish(chunk);
    });

    req.on('end', () => {
        res.sendStatus(200);
    });

    req.on('error', (err) => {
        console.error(err);
        res.sendStatus(500);
    });
});

export default router;