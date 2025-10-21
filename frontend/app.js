const API_BASE = (location.protocol === 'file:') ? 'http://localhost:3000/api' : '/api';

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

  if (cantidad > 10) {
    alert('El máximo permitido es de 10 entradas por compra.');
    return; // ⛔ corta la ejecución, no genera ningún visitante
  }

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
    const visitantesHTML = body.visitantes
      .map((v, i) => `<li>Visitante ${i + 1}: ${v.edad} años — ${v.tipoPase.toUpperCase()}</li>`)
      .join('');

    const modalBodyHTML = `
      <p><strong>${body.cantidad}</strong> entrada${body.cantidad > 1 ? 's' : ''} para el <strong>${new Date(body.fechaVisita).toLocaleDateString()}</strong></p>
      <ul class="list-unstyled">${visitantesHTML}</ul>
      ${body.qrCode ? `<img src="${body.qrCode}" alt="QR" class="img-fluid my-3" style="max-width:200px;">` : ''}
    `;

    const modalTitle = byId('ticket-modal-title');
    const modalBody = byId('ticket-modal-body');

    if (payload.pago === 'mercado_pago') {
      modalTitle.textContent = '✅ Pago aprobado';
      modalBody.innerHTML = modalBodyHTML + `
        <p class="text-muted">Tu pago fue procesado exitosamente mediante Mercado Pago.</p>
      `;
    } else if (payload.pago === 'efectivo') {
      modalTitle.textContent = '✅ Compra registrada correctamente';
      modalBody.innerHTML = modalBodyHTML + `
        <p class="mt-2 text-muted">💵 Recordá que debés abonar en la <strong>boletería del parque</strong> antes de tu visita.</p>
      `;
    }

    const modal = new bootstrap.Modal(document.getElementById('ticketModal'));
    modal.show();
  } catch (err) {
    showAlert(err.message || String(err));
  }
});

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
