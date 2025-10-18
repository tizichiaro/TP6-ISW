const API_BASE = (location.protocol === 'file:') ? 'http://localhost:3000/api' : '/api'; // fallback para abrir archivo local

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

const fetchUsers = async () => {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) return [];
  return res.json();
};

// =====================================================
// 🧾 Elementos del formulario
// =====================================================
const form = byId('buy-form');
const fechaInput = byId('fecha');
const cantidadInput = byId('cantidad');
const visitantesList = byId('visitantes-list');
const addVisitorBtn = byId('add-visitor');
const tipoPaseSelect = byId('tipoPase');
const pagoSelect = byId('pago');
const btnLogout = byId('btn-logout');
const userBadge = byId('user-badge');

// =====================================================
// 👥 Sincronización de visitantes
// =====================================================
const syncVisitors = () => {
  visitantesList.innerHTML = '';
  const cantidad = Number(cantidadInput.value) || 1;
  for (let i = 0; i < cantidad; i++) {
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
      <span class="input-group-text">${i + 1}</span>
      <input type="number" min="0" value="30" class="form-control visitor-age" data-index="${i}" />
    `;
    visitantesList.appendChild(div);
  }
};

// =====================================================
// 🎟️ Eventos del formulario
// =====================================================

// 🔹 Detectar cambio en cantidad (sin forzar máximo)
cantidadInput.addEventListener('change', () => {
  syncVisitors();
});

// 🔹 Agregar visitante manualmente
addVisitorBtn.addEventListener('click', () => {
  cantidadInput.value = Number(cantidadInput.value) + 1;
  syncVisitors();
});

// 🔹 Bloquear lunes en el calendario
fechaInput.addEventListener('change', () => {
  const fecha = new Date(fechaInput.value);
  if (fecha.getDay() === 1) { // 1 = lunes
    showAlert('El parque está cerrado los lunes. Seleccioná otro día.', 'warning');
    fechaInput.value = ''; // limpiar selección
  }
});

// 🔹 Logout
btnLogout.addEventListener('click', () => {
  document.cookie = 'token=; path=/; max-age=0';
  token = null;
  currentUser = null;
  userBadge.classList.add('d-none');
  userBadge.textContent = '';
  btnLogout.classList.add('d-none');
  window.location.href = '/login.html';
});

// =====================================================
// 🧾 Envío del formulario
// =====================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertArea.innerHTML = '';

  if (!currentUser) {
    showAlert('Debe iniciar sesión para comprar entradas', 'warning');
    return;
  }

  const visitantes = Array.from(document.querySelectorAll('.visitor-age')).map(i => ({ edad: Number(i.value) }));

  const payload = {
    fechaVisita: new Date(fechaInput.value).toISOString(),
    cantidad: Number(cantidadInput.value),
    visitantes,
    tipoPase: tipoPaseSelect.value,
    pago: pagoSelect.value,
    userId: currentUser.id
  };

  if (!payload.pago) {
    showAlert('Seleccione una forma de pago', 'danger');
    return;
  }

  try {
    const headers = { 'Content-Type': 'application/json' };

    // intentar usar token en memoria o cookie
    if (token) headers['Authorization'] = `Bearer ${token}`;
    else {
      const cookieMatch = document.cookie.match(/(?:^|; )token=([^;]+)/);
      if (cookieMatch) headers['Authorization'] = `Bearer ${decodeURIComponent(cookieMatch[1])}`;
    }

    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      let errMsg = 'Error en la compra';
      try { const j = await res.json(); if (j && j.message) errMsg = j.message; } catch (_) {}
      throw new Error(errMsg);
    }

    const body = await res.json();

    // 💳 Simulación Mercado Pago
    if (payload.pago === 'mercado_pago') {
      showAlert('Redirigiendo a Mercado Pago (simulado)...', 'info');
      setTimeout(() => {
        window.location.href = 'https://www.mercadopago.com.ar/';
      }, 1200);
    } else {
      showAlert(`Compra realizada: ${body.cantidad} entradas para ${new Date(body.fechaVisita).toLocaleDateString()}`, 'success');
    }

  } catch (err) {
    showAlert(err.message || String(err));
  }
});

// =====================================================
// 🚀 Inicialización automática
// =====================================================
(async function init() {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  $('#fecha').datepicker({
    format: 'yyyy-mm-dd',
    language: 'es',
    todayHighlight: true,
    autoclose: true,
    startDate: new Date(), // desde hoy
    daysOfWeekDisabled: [1], // 🚫 lunes bloqueados
  });
  syncVisitors();

  // Recuperar sesión desde cookie si existe
  const cookieMatch = document.cookie.match(/(?:^|; )token=([^;]+)/);
  if (cookieMatch) {
    token = decodeURIComponent(cookieMatch[1]);
    const m = token.match(/^mock-token-(\d+)$/);
    if (m) {
      try {
        const users = await fetchUsers();
        const u = users.find(x => x.id === Number(m[1]));
        if (u) {
          currentUser = u;
          userBadge.classList.remove('d-none');
          userBadge.textContent = currentUser.name;
          btnLogout.classList.remove('d-none');
        }
      } catch (err) {
        // ignorar
      }
    }
  } else {
    const next = location.pathname + location.search;
    window.location.href = `/login.html?next=${encodeURIComponent(next)}`;
    return;
  }
})();
