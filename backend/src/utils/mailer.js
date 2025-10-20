import nodemailer from 'nodemailer';

// ==========================
// 📧 CONFIGURACIÓN SMTP
// ==========================
let transporter = null;

const hasSmtpConfig = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

if (hasSmtpConfig) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
} else {
  // 🚧 Modo mock (para desarrollo sin SMTP)
  transporter = {
    sendMail: async (mail) => {
      console.log('=== Mock email (no SMTP configurado) ===');
      console.log('From:', mail.from);
      console.log('To:', mail.to);
      console.log('Subject:', mail.subject);
      console.log('Text:\n', mail.text);
      if (mail.html) console.log('HTML:\n', mail.html);
      return Promise.resolve({ accepted: [mail.to] });
    }
  };
}

// ==========================
// 📩 FUNCIÓN DE ENVÍO
// ==========================
export async function sendTicketConfirmation(ticket, toEmail) {
  if (!toEmail) {
    throw new Error('toEmail es obligatorio para enviar la confirmación');
  }

  const from = process.env.MAIL_FROM || 'no-reply@parque.example.com';
  const subject = `🎟️ Confirmación de compra - Ticket #${ticket.id}`;

  // 🧍‍♂️ Formatear visitantes
  let visitantesTexto = 'Sin visitantes registrados';
  if (Array.isArray(ticket.visitantes) && ticket.visitantes.length > 0) {
    visitantesTexto = ticket.visitantes
      .map((v, i) => {
        const nombre = v.nombre || `Visitante ${i + 1}`;
        const edad = v.edad !== undefined ? `${v.edad} años` : 'Edad no indicada';
        const tipoPase = v.tipoPase || 'N/A';
        return `• ${nombre} - ${edad} - Pase ${tipoPase}`;
      })
      .join('\n');
  }

  // 📄 Texto plano
  const text = [
    `Gracias por su compra.`,
    ``,
    `Detalle de la reserva:`,
    `ID: ${ticket.id}`,
    `Fecha de visita: ${new Date(ticket.fechaVisita).toLocaleDateString()}`,
    `Cantidad: ${ticket.cantidad}`,
    `Forma de pago: ${ticket.pago}`,
    `User ID: ${ticket.userId}`,
    ``,
    `Visitantes:`,
    `${visitantesTexto}`,
    ``,
    `¡Esperamos verlo pronto!`
  ].join('\n');

  // ✉️ Datos del correo
  const mailOptions = {
    from,
    to: toEmail,
    subject,
    text
  };

  return transporter.sendMail(mailOptions);
}

export default { sendTicketConfirmation };
