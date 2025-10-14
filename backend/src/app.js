import express, { json } from 'express';
import userRoutes from './routes/user.routes.js';
import ticketRoutes from './routes/ticket.routes.js';


const app = express();

// Middlewares
app.use(express.json());

// Rutas
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);


// Healthcheck (útil para CI)
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

export default app;
