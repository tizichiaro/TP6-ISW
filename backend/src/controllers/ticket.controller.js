import { getUserById } from './user.controller.js';
import { sendTicketConfirmation } from '../utils/mailer.js';

const tickets = [];
let nextId = 1;

// 🏞️ Parque cerrado los martes
const parqueAbierto = (fecha) => {
  const dia = new Date(fecha).getDay(); // 0=Dom, 1=Lun, 2=Mar...
  return dia !== 1 && dia !== 2;
};

export const crearTicket = async (req, res) => {
  try {
    const { fechaVisita, cantidad, visitantes, tipoPase, pago, userId } = req.body;

    // 🔒 Validar autenticación
    const tokenUserId = req.authUserId;
    if (tokenUserId !== userId) {
      return res.status(403).json({ message: 'Token inválido para el userId provisto' });
    }

    // ======================
    // 🔍 VALIDACIONES
    // ======================

    if (!pago) {
      return res.status(400).json({ message: 'Debe seleccionar una forma de pago' });
    }

    if (cantidad === undefined || cantidad === null) {
      return res.status(400).json({ message: 'Debe indicar la cantidad de entradas' });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ message: 'La cantidad debe ser mayor a 0' });
    }
    if (!fechaVisita || !userId || !tipoPase) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const fecha = new Date(fechaVisita);
    const hoy = new Date();

    // Normalizar para comparar solo día/mes/año
    const fechaSoloDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const hoySoloDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    if (isNaN(fecha) || fechaSoloDia < hoySoloDia) {
      return res.status(400).json({ message: 'La fecha de visita no puede ser pasada' });
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

    if (!['regular', 'vip'].includes(tipoPase)) {
      return res.status(400).json({ message: 'Tipo de pase inválido' });
    }

    if (!Array.isArray(visitantes) || visitantes.length !== cantidad) {
      return res.status(400).json({ message: 'Cantidad de visitantes no coincide con el número de entradas' });
    }

    if (visitantes.some(v => typeof v.edad !== 'number' || v.edad < 0)) {
      return res.status(400).json({ message: 'Edad de visitante inválida' });
    }

    // ======================
    // 🎟️ CREACIÓN SIMULADA
    // ======================

    const ticket = {
      id: nextId++,
      fechaVisita,
      cantidad,
      visitantes,
      tipoPase,
      pago,
      userId
    };

    // 💳 Simulación de pasarela de pago
    if (pago === 'mercado_pago') {
      ticket.checkoutUrl = 'https://fake.mercadopago.checkout/simulacion';
    }

    // 📧 Simulación de envío de correo
    ticket.emailSent = false;
    const user = getUserById(userId);

    if (user && user.email) {
      console.log(`📧 Simulando envío de mail a ${user.email}...`);
      try {
        await sendTicketConfirmation(ticket, user.email);
        ticket.emailSent = true;
        console.log(`✅ Email de confirmación simulado enviado a ${user.email}`);
      } catch (err) {
        console.error('❌ Error simulando envío de mail:', err.message || err);
      }
    } else {
      console.log(`⚠️ Usuario ${userId} sin email — no se simuló envío de mail`);
    }

    tickets.push(ticket);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ message: 'Error al procesar la compra' });
  }
};

export const obtenerTickets = (_req, res) => {
  res.json(tickets);
};
