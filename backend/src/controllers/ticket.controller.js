const tickets = [];
let nextId = 1;

// Ejemplo: parque cerrado los martes
const parqueAbierto = (fecha) => {
  const dia = new Date(fecha).getDay(); // 0=Dom, 1=Lun, ..., 2=Mar
  return dia !== 2;
};

export const crearTicket = (req, res) => {
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

  console.log(`📧 Enviando mail de confirmación al usuario ${userId}...`);
  res.status(201).json(ticket);
};

export const obtenerTickets = (_req, res) => {
  res.json(tickets);
};
