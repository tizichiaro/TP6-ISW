import { getUserById } from './user.controller.js';
import { sendTicketConfirmation } from '../utils/mailer.js';
import QRCode from 'qrcode';

const tickets = [];
let nextId = 1;

// 🏞️ Parque cerrado los martes
const parqueAbierto = (fecha) => {
  const dia = new Date(fecha).getDay(); // 0=Dom, 1=Lun, 2=Mar...
  return dia !== 1 && dia !== 2;
};

export const crearTicket = async (req, res) => {
  try {
    const { fechaVisita, cantidad, visitantes, pago, userId } = req.body;

    // 🔒 Validar autenticación
    const tokenUserId = req.authUserId;
    if (tokenUserId !== userId) {
      return res.status(403).json({ message: 'Token inválido para el userId provisto' });
    }

    // ======================
    // 🔍 VALIDACIONES
    // ======================

    if (!pago) return res.status(400).json({ message: 'Debe seleccionar una forma de pago' });
    if (!fechaVisita || !userId) return res.status(400).json({ message: 'Faltan datos obligatorios' });

    const fecha = new Date(fechaVisita);
    const hoy = new Date();
    const fechaSoloDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const hoySoloDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    if (isNaN(fecha) || fechaSoloDia < hoySoloDia)
      return res.status(400).json({ message: 'La fecha de visita no puede ser pasada' });
    if (!parqueAbierto(fecha))
      return res.status(400).json({ message: 'El parque está cerrado ese día' });
    if (cantidad <= 0 || cantidad > 10)
      return res.status(400).json({ message: 'Cantidad inválida de entradas' });
    if (!['efectivo', 'mercado_pago'].includes(pago))
      return res.status(400).json({ message: 'Forma de pago inválida' });

    // validar visitantes
    if (!Array.isArray(visitantes) || visitantes.length !== cantidad)
      return res.status(400).json({ message: 'Cantidad de visitantes no coincide con el número de entradas' });

    for (const [i, v] of visitantes.entries()) {
      if (typeof v.edad !== 'number' || v.edad < 0)
        return res.status(400).json({ message: `Edad inválida en visitante #${i + 1}` });
      if (!['regular', 'vip'].includes(v.tipoPase))
        return res.status(400).json({ message: `Tipo de pase inválido en visitante #${i + 1}` });
    }

    // ======================
    // 🎟️ CREACIÓN SIMULADA
    // ======================

    const ticket = {
      id: nextId++,
      fechaVisita,
      cantidad,
      visitantes,
      pago,
      userId
    };

    if (pago === 'mercado_pago')
      ticket.checkoutUrl = 'https://fake.mercadopago.checkout/simulacion';

    // 📧 Simulación de envío de correo
    const user = getUserById(userId);
    ticket.emailSent = false;
    if (user && user.email) {
      try {
        await sendTicketConfirmation(ticket, user.email);
        ticket.emailSent = true;
      } catch (err) {
        console.error('❌ Error simulando envío de mail:', err.message || err);
      }
    }

    // 🧾 Crear QR con la info del ticket completo
    const qrData = JSON.stringify({
      id: ticket.id,
      userId: ticket.userId,
      fechaVisita: ticket.fechaVisita,
      visitantes: ticket.visitantes
    });

    ticket.qrCode = await QRCode.toDataURL(qrData);

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
