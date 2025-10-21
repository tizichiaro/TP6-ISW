import nodemailer from 'nodemailer';

// 🧩 Utilidad para enviar emails. Si no hay configuración SMTP, usa un "mock"
// que imprime el contenido del correo en consola en lugar de enviarlo.

// Determina si hay configuración SMTP real
const hasSmtpConfig = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

let transporter;

if (hasSmtpConfig) {
  // 🔐 Config real (si usás SMTP)
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
} else {
  // 🧪 Transportador "mock" → imprime en consola
  transporter = {
    sendMail: async (mail) => {
      console.log('=== Mock email (no SMTP configurado) ===');
      console.log('From:', mail.from);
      console.log('To:', mail.to);
      console.log('Subject:', mail.subject);
      console.log('Text:\n', mail.text);
      if (mail.html) console.log('HTML:\n', mail.html);
      console.log('========================================');
      return Promise.resolve({ accepted: [mail.to] });
    },
  };
}

// 📬 Envío de confirmación de ticket (mock incluido)
export async function sendTicketConfirmation(ticket) {
  // Remitente y destinatario fijos para pruebas
  const from = 'tizichiaro@gmail.com';
  const toEmail = 'tizichiaro1@gmail.com';
  const subject = `Confirmación de compra - Ticket #${ticket.id}`;

  // ✅ Convertimos los visitantes a texto legible
  let visitantesTexto = 'Sin visitantes';
  let visitantesHTML = '<li>Sin visitantes</li>';

  if (Array.isArray(ticket.visitantes) && ticket.visitantes.length > 0) {
    visitantesTexto = ticket.visitantes
      .map((v, i) => `Visitante ${i + 1}: Edad ${v.edad}, Pase ${v.tipoPase}`)
      .join('\n');

    visitantesHTML = ticket.visitantes
      .map(
        (v, i) =>
          `<li><strong>Visitante ${i + 1}</strong>: Edad ${v.edad}, Pase ${v.tipoPase}</li>`
      )
      .join('');
  }

  const textLines = [
    `Gracias por su compra.`,
    `\nDetalle de la reserva:`,
    `Fecha de visita: ${ticket.fechaVisita}`,
    `Cantidad: ${ticket.cantidad}`,
    `Forma de pago: ${ticket.pago}`,
    `Visitantes:\n${visitantesTexto}`,
    `\n¡Esperamos verlo pronto!`,
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
      <li><strong>Visitantes</strong>:</li>
      <ul>${visitantesHTML}</ul>
    </ul>
    <p>¡Esperamos verlo pronto!</p>
  `;

  const mailOptions = {
    from,
    to: toEmail,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
}

export default { sendTicketConfirmation };
