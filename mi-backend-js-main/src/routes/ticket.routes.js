import { Router } from 'express';
import { crearTicket, obtenerTickets } from '../controllers/ticket.controller.js';

const router = Router();

router.post('/', crearTicket);
router.get('/', obtenerTickets);

export default router;
