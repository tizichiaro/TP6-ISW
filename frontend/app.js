const API_BASE = (location.protocol === 'file:') ? 'http://localhost:3000/api' : '/api';

// ⚙️ Simulación de Mercado Pago
const USE_MP_MOCK = true;              // true = simulación
const MP_PAYMENT_APPROVED = false;      // true = aprobado | false = rechazado

let currentUser = null;
let token = null;
let modalInstance = null; // referencia global al modal bootstrap

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
  let cantidad = Number(cantidadInput.value) || 1;

  // 🔒 Limitar mínimo 1 y máximo 10
  if (cantidad < 1) cantidad = 1;
  if (cantidad > 10) cantidad = 10;

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
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let msg = 'Error en la compra';
      try {
        const err = await res.json();
        if (err.message) msg = err.message;
      } catch {}
      throw new Error(msg);
    }

    const body = await res.json();

    // =====================================================
    // 💳 Si el pago es Mercado Pago → Simulamos checkout
    // =====================================================
    if (payload.pago === 'mercado_pago' && USE_MP_MOCK) {
      await simularPagoMercadoPago(body);
      return;
    }

    // 💵 Pago en efectivo (flujo normal)
    mostrarPopupResultado(body, true, true);

  } catch (err) {
    showAlert(err.message || String(err));
  }
});

// =====================================================
// 💳 Simulación de pago Mercado Pago
// =====================================================
async function simularPagoMercadoPago(body) {
  // 1️⃣ Mostrar mensaje de redirección
  mostrarPopupMensaje('Redirigiendo al checkout de Mercado Pago...', 'info');

  setTimeout(() => {
    // 2️⃣ Simular apertura de checkout
    window.open(
      body.checkoutUrl || 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=TEST-123',
      '_blank'
    );

    // 3️⃣ Cerrar popup de mensaje antes de continuar
    if (modalInstance) modalInstance.hide();

    // 4️⃣ Esperar un momento antes de mostrar el resultado
    setTimeout(() => {
      mostrarPopupResultado(body, MP_PAYMENT_APPROVED);
    }, 2000);
  }, 1000);
}

// =====================================================
// 🪧 POPUP 1: mensaje inicial
// =====================================================
function mostrarPopupMensaje(mensaje, tipo = 'info') {
  const modalEl = byId('ticketModal');
  const modalTitle = byId('ticket-modal-title');
  const modalBody = byId('ticket-modal-body');

  modalTitle.textContent = tipo === 'info' ? 'Procesando pago...' : 'Aviso';
  modalBody.innerHTML = `
    <p class="text-${tipo === 'info' ? 'primary' : 'muted'} mb-3">${mensaje}</p>
    <div class="progress" style="height: 6px;">
      <div class="progress-bar progress-bar-striped progress-bar-animated bg-${tipo === 'info' ? 'primary' : 'secondary'}" style="width: 100%"></div>
    </div>
  `;

  // Cerrar instancia anterior si existía
  if (modalInstance) modalInstance.hide();

  modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();
}

// =====================================================
// 🪪 POPUP 2: resultado (confirmación / rechazo)
// =====================================================
function mostrarPopupResultado(ticket, aprobado = true, esEfectivo = false) {
  const modalEl = byId('ticketModal');
  const modalTitle = byId('ticket-modal-title');
  const modalBody = byId('ticket-modal-body');

  // cerrar popup previo (por si quedó abierto)
  if (modalInstance) modalInstance.hide();

  if (!aprobado) {
    modalTitle.textContent = '❌ Pago rechazado';
    modalBody.innerHTML = `
      <p class="text-danger">Tu pago fue rechazado. No se generaron entradas.</p>
      <p class="text-muted">Podés intentar nuevamente o usar otro medio de pago.</p>
      <div class="text-end">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
      </div>
    `;
  } else {
    const visitantesHTML = ticket.visitantes
      .map((v, i) => `<li>Visitante ${i + 1}: ${v.edad} años — ${v.tipoPase.toUpperCase()}</li>`)
      .join('');

    const modalBodyHTML = `
      <p><strong>${ticket.cantidad}</strong> entrada${ticket.cantidad > 1 ? 's' : ''} para el <strong>${new Date(ticket.fechaVisita).toLocaleDateString()}</strong></p>
      <ul class="list-unstyled">${visitantesHTML}</ul>
      ${ticket.qrCode ? `<img src="${ticket.qrCode}" alt="QR" class="img-fluid my-3" style="max-width:200px;">` : ''}
    `;

    modalTitle.textContent = esEfectivo ? '✅ Compra registrada correctamente' : '✅ Pago aprobado';
    modalBody.innerHTML = modalBodyHTML + `
      <p class="text-muted">
        ${esEfectivo
          ? '💵 Recordá abonar en la <strong>boletería del parque</strong> antes de tu visita.'
          : 'Tu pago fue procesado exitosamente mediante Mercado Pago.'}
      </p>
    `;

    setTimeout(() => {
      const btnInfo = byId('btn-ver-entradas');
      if (btnInfo) {
        btnInfo.addEventListener('click', () => {
          window.location.href = '/entradas.html';
        });
      }
    }, 200);
  }

  modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();
}

// =====================================================
// 🚀 Inicialización
// =====================================================
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
}

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
