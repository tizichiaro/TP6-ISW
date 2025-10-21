import { getUserById } from './user.controller.js';
import { sendTicketConfirmation } from '../utils/mailer.js';
import QRCode from 'qrcode';

const LIMITE_ENTRADAS_POR_DIA = 15;

// 🏞️ Parque cerrado lunes
const parqueAbierto = (fecha) => {
  const d = new Date(fecha);
  const dia = d.getUTCDay(); // 0=Dom, 1=Lun, 2=Mar, ...
  return dia !== 1; // ✅ cierra sólo lunes
};

// 🧮 Lista de tickets en memoria
let tickets = [];
let nextId = 1;

// 🎟️ Crear ticket
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
const fechaUTC = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
const hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());

if (isNaN(fecha) || fechaUTC < hoyUTC) {
  return res.status(400).json({ message: 'La fecha de visita no puede ser pasada' });
}
    if (!parqueAbierto(fecha))
      return res.status(400).json({ message: 'El parque está cerrado ese día' });
    if (cantidad <= 0 || cantidad > 10)
      return res.status(400).json({ message: 'Cantidad inválida de entradas' });
    if (!['efectivo', 'mercado_pago'].includes(pago))
      return res.status(400).json({ message: 'Forma de pago inválida' });

    const hoySoloDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const limiteMax = new Date(hoySoloDia);
    limiteMax.setMonth(limiteMax.getMonth() + 2);
    if (fecha > limiteMax) {
      const y = limiteMax.getFullYear();
      const m = String(limiteMax.getMonth() + 1).padStart(2, '0');
      const d = String(limiteMax.getDate()).padStart(2, '0');
      return res.status(400).json({
        message: `Solo se pueden comprar entradas hasta ${y}-${m}-${d} (máximo 2 meses desde hoy).`
      });
    }

    if (!Array.isArray(visitantes) || visitantes.length !== cantidad)
      return res.status(400).json({ message: 'Cantidad de visitantes no coincide con el número de entradas' });

    for (const [i, v] of visitantes.entries()) {
      if (typeof v.edad !== 'number' || v.edad < 0 || v.edad > 120)
        return res.status(400).json({ message: `Verifique las edades de los visitantes`});
      if (!['regular', 'vip'].includes(v.tipoPase))
        return res.status(400).json({ message: `Tipo de pase inválido en visitante #${i + 1}` });
    }

    // ======================
    // 🧮 CONTROL DE CAPACIDAD DIARIA
    // ======================
    const fechaClave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    const entradasVendidasEseDia = tickets
      .filter(t => {
        const f = new Date(t.fechaVisita);
        const claveTicket = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
        return claveTicket === fechaClave;
      })
      .reduce((sum, t) => sum + t.cantidad, 0);

    if (entradasVendidasEseDia >= LIMITE_ENTRADAS_POR_DIA) {
      return res.status(400).json({
        message: `El cupo para el ${fechaClave} ya está completo (${LIMITE_ENTRADAS_POR_DIA} entradas).`,
      });
    }

    if (entradasVendidasEseDia + cantidad > LIMITE_ENTRADAS_POR_DIA) {
      const disponibles = LIMITE_ENTRADAS_POR_DIA - entradasVendidasEseDia;
      return res.status(400).json({
        message: `Solo quedan ${disponibles} entradas disponibles para el ${fechaClave}.`,
      });
    }

    // ======================
    // 🎟️ CREAR Y GUARDAR TICKET EN MEMORIA
    // ======================
    const ticket = {
      id: nextId++,
      fechaVisita,
      cantidad,
      visitantes,
      pago,
      userId,
    };

    if (pago === 'mercado_pago')
      ticket.checkoutUrl = 'https://fake.mercadopago.checkout/simulacion';

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

    const qrData = JSON.stringify({
      id: ticket.id,
      userId: ticket.userId,
      fechaVisita: ticket.fechaVisita,
      visitantes: ticket.visitantes,
    });
    ticket.qrCode = await QRCode.toDataURL(qrData);

    tickets.push(ticket);

    res.status(201).json(ticket);

  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ message: 'Error al procesar la compra' });
  }
};

// 📋 Obtener todos los tickets (solo en memoria)
export const obtenerTickets = (_req, res) => {
  res.json(tickets);
};
