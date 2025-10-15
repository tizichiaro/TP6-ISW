import { getUserById } from './user.controller.js';
import { sendTicketConfirmation } from '../utils/mailer.js';

const tickets = [];
let nextId = 1;

// Ejemplo: parque cerrado los martes
const parqueAbierto = (fecha) => {
  const dia = new Date(fecha).getDay(); // 0=Dom, 1=Lun, ..., 2=Mar
  return dia !== 2;
};

export const crearTicket = async (req, res) => {
  const { fechaVisita, cantidad, visitantes, tipoPase, pago, userId } = req.body;

  // Autenticación: el middleware `requireAuth` dejó el id en req.authUserId
  const tokenUserId = req.authUserId;
  if (tokenUserId !== userId) return res.status(403).json({ message: 'Token inválido para el userId provisto' });

  // Validaciones
  if (!fechaVisita || !cantidad || !pago || !userId) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  const fecha = new Date(fechaVisita);
  const hoy = new Date();
  if (isNaN(fecha) || fecha < hoy) {
    return res.status(400).json({ message: 'La fecha debe ser actual o futura' });
  }

  if (!parqueAbierto(fecha)) {
    return res.status(400).json({ message: 'El parque está cerrado ese día' });
  }

  if (cantidad > 10) {
    return res.status(400).json({ message: 'No se pueden comprar más de 10 entradas' });
  }

  if (!['efectivo', 'mercado_pago'].includes(pago)) {
    return res.status(400).json({ message: 'Forma de pago inválida' });
  }

  const ticket = {
    id: nextId++,
    fechaVisita,
    cantidad,
    visitantes,
    tipoPase,
    pago,
    userId
  };
  tickets.push(ticket);
  // Intentar enviar correo de confirmación al email del usuario (si existe)
  const user = getUserById(userId);
  if (user && user.email) {
    console.log(`📧 Enviando mail de confirmación al usuario ${userId} <${user.email}>...`);
    // No bloqueamos la respuesta por una posible falla en el envío; igualmente
    // esperamos la promesa para poder loggear si hubo éxito o error.
    try {
      await sendTicketConfirmation(ticket, user.email);
      console.log(`✅ Email de confirmación enviado a ${user.email}`);
    } catch (err) {
      console.error('❌ Error enviando email de confirmación:', err.message || err);
    }
  } else {
    console.log(`⚠️ Usuario ${userId} sin email conocido — no se envió confirmación por mail.`);
  }

  res.status(201).json(ticket);
};

export const obtenerTickets = (_req, res) => {
  res.json(tickets);
};
