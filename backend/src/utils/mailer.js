import nodemailer from 'nodemailer';

// Utilidad para enviar emails. Lee configuración desde variables de entorno:
// - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE
// - MAIL_FROM (dirección desde la que se envían los correos)
// Si no hay configuración SMTP, la función de envío hará un console.log
// (modo mock) para que el backend siga funcionando en desarrollo.

let transporter = null;

const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

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
  // Transportador "mock" que simplemente escribe en consola.
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

export async function sendTicketConfirmation(ticket, toEmail) {
  if (!toEmail) {
    throw new Error('toEmail es obligatorio para enviar la confirmación');
  }

  const from = process.env.MAIL_FROM || 'no-reply@parque.example.com';
  const subject = `Confirmación de compra - Ticket #${ticket.id}`;

  const textLines = [
    `Gracias por su compra.`,
    `\nDetalle de la reserva:`,
    `ID: ${ticket.id}`,
    `Fecha de visita: ${ticket.fechaVisita}`,
    `Cantidad: ${ticket.cantidad}`,
    `Tipo de pase: ${ticket.tipoPase || 'N/A'}`,
    `Forma de pago: ${ticket.pago}`,
    `User ID: ${ticket.userId}`,
    `Visitantes: ${Array.isArray(ticket.visitantes) ? ticket.visitantes.join(', ') : ticket.visitantes}`,
    `\n¡Esperamos verlo pronto!`
  ];

  const text = textLines.join('\n');

  const html = `
    <p>Gracias por su compra.</p>
    <h3>Detalle de la reserva</h3>
    <ul>
      <li><strong>ID</strong>: ${ticket.id}</li>
      <li><strong>Fecha de visita</strong>: ${ticket.fechaVisita}</li>
      <li><strong>Cantidad</strong>: ${ticket.cantidad}</li>
      <li><strong>Tipo de pase</strong>: ${ticket.tipoPase || 'N/A'}</li>
      <li><strong>Forma de pago</strong>: ${ticket.pago}</li>
      <li><strong>User ID</strong>: ${ticket.userId}</li>
      <li><strong>Visitantes</strong>: ${Array.isArray(ticket.visitantes) ? ticket.visitantes.join(', ') : ticket.visitantes}</li>
    </ul>
    <p>¡Esperamos verlo pronto!</p>
  `;

  const mailOptions = {
    from,
    to: toEmail,
    subject,
    text,
    html
  };

  return transporter.sendMail(mailOptions);
}

export default { sendTicketConfirmation };
