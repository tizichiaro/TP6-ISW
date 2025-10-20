import { Router } from 'express';
import { crearTicket, obtenerTickets } from '../controllers/ticket.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', requireAuth, crearTicket);
router.get('/', obtenerTickets);

export default router;
