import { getUserById } from './user.controller.js';
import { sendTicketConfirmation } from '../utils/mailer.js';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.resolve('./data/tickets.json');
const LIMITE_ENTRADAS_POR_DIA = 15;

// 🏞️ Parque cerrado martes y miércoles
const parqueAbierto = (fecha) => {
  const dia = new Date(fecha).getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie...
  return dia !== 0 ;
};

// 📂 Cargar tickets existentes (si el archivo existe)
let tickets = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    tickets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  }
} catch (err) {
  console.error('❌ Error leyendo archivo de tickets:', err);
  tickets = [];
}

// 💾 Guardar tickets en archivo
const guardarTickets = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ Error guardando archivo de tickets:', err);
  }
};

let nextId = tickets.length ? Math.max(...tickets.map(t => t.id)) + 1 : 1;

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

    if (!Array.isArray(visitantes) || visitantes.length !== cantidad)
      return res.status(400).json({ message: 'Cantidad de visitantes no coincide con el número de entradas' });

    for (const [i, v] of visitantes.entries()) {
      if (typeof v.edad !== 'number' || v.edad < 0)
        return res.status(400).json({ message: `Edad inválida en visitante #${i + 1}` });
      if (!['regular', 'vip'].includes(v.tipoPase))
        return res.status(400).json({ message: `Tipo de pase inválido en visitante #${i + 1}` });
    }

    // ======================
    // 🧮 CONTROL DE CAPACIDAD DIARIA (ROBUSTO CON ZONA HORARIA)
    // ======================
    const fechaClave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

    // Sumar cantidad total de entradas vendidas ese día
    const entradasVendidasEseDia = tickets
      .filter(t => {
        const f = new Date(t.fechaVisita);
        const claveTicket = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
        return claveTicket === fechaClave;
      })
      .reduce((sum, t) => sum + t.cantidad, 0);

    console.log(`🧮 Entradas vendidas el ${fechaClave}: ${entradasVendidasEseDia}`);

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
    // 🎟️ CREAR Y GUARDAR TICKET
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

    // 🧾 Crear QR con la info del ticket
    const qrData = JSON.stringify({
      id: ticket.id,
      userId: ticket.userId,
      fechaVisita: ticket.fechaVisita,
      visitantes: ticket.visitantes,
    });
    ticket.qrCode = await QRCode.toDataURL(qrData);

    tickets.push(ticket);
    guardarTickets(); 

    res.status(201).json(ticket);

  } catch (error) {
    console.error('Error al crear ticket:', error);
    res.status(500).json({ message: 'Error al procesar la compra' });
  }
};

export const obtenerTickets = (_req, res) => {
  res.json(tickets);
};
