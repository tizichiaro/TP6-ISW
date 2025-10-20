const API_BASE = (location.protocol === 'file:') ? 'http://localhost:3000/api' : '/api';

// =====================================================
// ⚙️ Configuración de simulación de pago
// =====================================================
const USE_MP_MOCK = true;              // dejamos mock activado
const MP_PAYMENT_APPROVED = true;      // ✅ true = aprobado | ❌ false = rechazado

let currentUser = null;
let token = null;

const byId = (id) => document.getElementById(id);
const alertArea = byId('alert-area');

const showAlert = (msg, type = 'danger') => {
  alertArea.innerHTML = `
    <div class="alert alert-${type} alert-dismissible" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
};

// =====================================================
// 👥 Generar visitantes dinámicos
// =====================================================
const visitantesList = byId('visitantes-list');
const cantidadInput = byId('cantidad');

const generarVisitantes = () => {
  visitantesList.innerHTML = '';
  const cantidad = Number(cantidadInput.value) || 1;

  for (let i = 0; i < cantidad; i++) {
    const div = document.createElement('div');
    div.className = 'border rounded p-3 mb-2 bg-light';
    div.innerHTML = `
      <h6>Visitante ${i + 1}</h6>
      <div class="mb-2">
        <label class="form-label">Edad</label>
        <input type="number" class="form-control visitor-age" min="0" value="30" required>
      </div>
      <div>
        <label class="form-label">Tipo de pase</label>
        <select class="form-select visitor-tipo-pase">
          <option value="regular">Regular</option>
          <option value="vip">VIP</option>
        </select>
      </div>
    `;
    visitantesList.appendChild(div);
  }
};

// =====================================================
// 💳 Simulación de pago Mercado Pago
// =====================================================
async function createMpPreference(payload) {
  if (USE_MP_MOCK) {
    // Simulación: devolvemos una URL de checkout y un id de pago
    return {
      ok: true,
      checkoutUrl: 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=TEST-123',
      paymentId: 'PAY-TEST-123'
    };
  }
  // (en entorno real iría la llamada fetch al backend)
}

// =====================================================
// 🧾 Envío del formulario
// =====================================================
const form = byId('buy-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertArea.innerHTML = '';

  const fechaInput = byId('fecha');
  const pagoSelect = byId('pago');

  if (!currentUser) {
    showAlert('Debe iniciar sesión para comprar entradas', 'warning');
    return;
  }

  const visitantes = Array.from(document.querySelectorAll('#visitantes-list > div')).map(div => ({
    edad: Number(div.querySelector('.visitor-age').value),
    tipoPase: div.querySelector('.visitor-tipo-pase').value
  }));

  const payload = {
    fechaVisita: new Date(fechaInput.value).toISOString(),
    cantidad: visitantes.length,
    visitantes,
    pago: pagoSelect.value,
    userId: currentUser.id
  };

  try {
    // =====================================================
    // 💰 Simular flujo Mercado Pago
    // =====================================================
    if (payload.pago === 'mercado_pago' && USE_MP_MOCK) {
      const pref = await createMpPreference(payload);

      // abrir ventana simulando checkout
      window.open(pref.checkoutUrl, '_blank');

      // mostrar modal "procesando pago..."
      const modalPago = new bootstrap.Modal(byId('modalPago'));
      const modalPagoTitle = byId('modal-pago-title');
      const modalPagoBody = byId('modal-pago-body');
      const modalPagoBtn = byId('modal-pago-btn');

      modalPagoTitle.textContent = 'Procesando pago...';
      modalPagoBody.innerHTML = `
        <div class="d-flex justify-content-center align-items-center my-3">
          <div class="spinner-border text-info me-2" role="status"></div>
          <span>Validando transacción con Mercado Pago...</span>
        </div>`;
      modalPagoBtn.classList.add('d-none');
      modalPago.show();

      setTimeout(() => {
        if (MP_PAYMENT_APPROVED) {
          modalPagoTitle.textContent = '✅ Pago aprobado';
          modalPagoBody.innerHTML = `
            <p class="text-success">Tu pago fue procesado exitosamente mediante Mercado Pago.</p>`;
          modalPagoBtn.textContent = 'Ver ticket';
          modalPagoBtn.classList.remove('d-none');
          modalPagoBtn.onclick = async () => {
            modalPago.hide();
            await mostrarTicket(payload, visitantes);
          };
        } else {
          modalPagoTitle.textContent = '❌ Pago rechazado';
          modalPagoBody.innerHTML = `
            <p class="text-danger">El pago fue rechazado por Mercado Pago. Por favor, intenta nuevamente.</p>`;
          modalPagoBtn.textContent = 'Cerrar';
          modalPagoBtn.classList.remove('d-none');
          modalPagoBtn.onclick = () => modalPago.hide();
        }
      }, 2000);

      return;
    }

    // Si el pago es efectivo
    await mostrarTicket(payload, visitantes);
  } catch (err) {
    showAlert(err.message || String(err));
  }
});

// =====================================================
// 🧾 Mostrar ticket
// =====================================================
async function mostrarTicket(payload, visitantes) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Simulación: devolvemos datos del ticket
  const body = {
    cantidad: payload.cantidad,
    fechaVisita: payload.fechaVisita,
    visitantes,
    qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TICKET-TEST'
  };

  const visitantesHTML = body.visitantes
    .map((v, i) => `<li>Visitante ${i + 1}: ${v.edad} años — ${v.tipoPase.toUpperCase()}</li>`)
    .join('');

  const modalTitle = byId('ticket-modal-title');
  const modalBody = byId('ticket-modal-body');
  const modalBodyHTML = `
    <p><strong>${body.cantidad}</strong> entrada${body.cantidad > 1 ? 's' : ''} para el <strong>${new Date(body.fechaVisita).toLocaleDateString()}</strong></p>
    <ul class="list-unstyled">${visitantesHTML}</ul>
    ${body.qrCode ? `<img src="${body.qrCode}" alt="QR" class="img-fluid my-3" style="max-width:200px;">` : ''}
  `;

  if (payload.pago === 'mercado_pago') {
    modalTitle.textContent = '🎟️ Ticket confirmado';
    modalBody.innerHTML = modalBodyHTML + `<p class="text-muted">Pago confirmado mediante Mercado Pago.</p>`;
  } else if (payload.pago === 'efectivo') {
    modalTitle.textContent = '💵 Compra registrada';
    modalBody.innerHTML = modalBodyHTML + `<p class="text-muted">Recordá abonar en la boletería antes de tu visita.</p>`;
  }

  const modal = new bootstrap.Modal(byId('ticketModal'));
  modal.show();
}

// =====================================================
// 🚀 Inicialización
// =====================================================
(async function init() {
  $('#fecha').datepicker({
    format: 'yyyy-mm-dd',
    language: 'es',
    todayHighlight: true,
    autoclose: true,
    startDate: new Date(),
    daysOfWeekDisabled: [1],
  });

  generarVisitantes();
  cantidadInput.addEventListener('change', generarVisitantes);

  // Simular sesión
  currentUser = { id: 1, name: "Nico" };
})();
