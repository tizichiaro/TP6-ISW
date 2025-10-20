import { jest } from '@jest/globals';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.resolve('./data/tickets.json');
let app;
let token;

// 🧹 Limpia entorno antes de cada test
beforeEach(async () => {
  // Reset archivo persistente
  if (fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

  // Limpia módulos en caché (reinicia backend)
  jest.resetModules();

  // Importa nueva instancia limpia del backend
  app = (await import('../src/app.js')).default;

  // Autenticación para obtener token válido
  const authRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ada@example.com', password: 'secret' });

  expect(authRes.statusCode).toBe(200);
  token = authRes.body.token;
});

// 📅 Genera una fecha válida (evita martes y miércoles)
const obtenerFechaAbierta = (diasDesdeHoy = 1) => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasDesdeHoy);
  while ([2, 3].includes(fecha.getDay())) {
    fecha.setDate(fecha.getDate() + 1);
  }
  return fecha.toISOString();
};

describe('Ticket API (Compra de entradas)', () => {

  // ================================
  // ❌ Casos inválidos
  // ================================
  describe('Casos inválidos', () => {

    test('Falla si no se selecciona forma de pago', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(),
        cantidad: 2,
        userId: 1,
        visitantes: [
          { edad: 20, tipoPase: 'regular' },
          { edad: 25, tipoPase: 'vip' }
        ]
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/pago/i);
    });

    test('Falla si el parque está cerrado (martes o miércoles)', async () => {
      const diaCerrado = new Date();
      diaCerrado.setDate(diaCerrado.getDate() + ((2 - diaCerrado.getDay() + 7) % 7)); // martes
      const payload = {
        fechaVisita: diaCerrado.toISOString(),
        cantidad: 2,
        pago: 'efectivo',
        userId: 1,
        visitantes: [
          { edad: 22, tipoPase: 'regular' },
          { edad: 30, tipoPase: 'vip' }
        ]
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/cerrado/i);
    });

    test('Falla si se intenta comprar más de 10 entradas', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(),
        cantidad: 15,
        pago: 'efectivo',
        userId: 1,
        visitantes: Array.from({ length: 15 }, () => ({ edad: 20, tipoPase: 'regular' }))
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/inválida/i);
    });

    test('Falla si la fecha es pasada', async () => {
      const ayer = new Date(Date.now() - 86400000).toISOString();
      const payload = {
        fechaVisita: ayer,
        cantidad: 1,
        pago: 'efectivo',
        userId: 1,
        visitantes: [{ edad: 20, tipoPase: 'regular' }]
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/pasad/i);
    });

    test('Falla si cantidad y visitantes no coinciden', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(),
        cantidad: 3,
        pago: 'efectivo',
        userId: 1,
        visitantes: [
          { edad: 20, tipoPase: 'regular' },
          { edad: 25, tipoPase: 'vip' }
        ]
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/visitantes/i);
    });

    test('Falla si alguna edad es inválida', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(),
        cantidad: 2,
        pago: 'efectivo',
        userId: 1,
        visitantes: [
          { edad: 20, tipoPase: 'regular' },
          { edad: -5, tipoPase: 'vip' }
        ]
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/edad/i);
    });

    test('Falla si tipoPase es inválido', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(),
        cantidad: 1,
        pago: 'efectivo',
        userId: 1,
        visitantes: [{ edad: 20, tipoPase: 'gold' }]
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/pase/i);
    });

    test('Falla si cantidad es 0 o negativa', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(),
        cantidad: 0,
        pago: 'efectivo',
        userId: 1,
        visitantes: []
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/cantidad/i);
    });

    test('Falla si no está autenticado', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(),
        cantidad: 2,
        pago: 'efectivo',
        visitantes: [
          { edad: 20, tipoPase: 'regular' },
          { edad: 25, tipoPase: 'vip' }
        ]
      };

      const res = await request(app).post('/api/tickets').send(payload);
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================
  // ✅ Casos válidos
  // ================================
  describe('Casos válidos', () => {
    test('Compra con Mercado Pago devuelve checkoutUrl', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(),
        cantidad: 3,
        visitantes: [
          { edad: 25, tipoPase: 'regular' },
          { edad: 30, tipoPase: 'vip' },
          { edad: 5, tipoPase: 'regular' }
        ],
        pago: 'mercado_pago',
        userId: 1
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('checkoutUrl');
    });

    test('Compra en efectivo (sin checkoutUrl)', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(5),
        cantidad: 2,
        visitantes: [
          { edad: 18, tipoPase: 'vip' },
          { edad: 40, tipoPase: 'regular' }
        ],
        pago: 'efectivo',
        userId: 1
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).not.toHaveProperty('checkoutUrl');
    });

    test('Compra válida con exactamente 10 entradas', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(3),
        cantidad: 10,
        visitantes: Array.from({ length: 10 }, () => ({ edad: 22, tipoPase: 'regular' })),
        pago: 'efectivo',
        userId: 1
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
    });

    test('Bloquea el día si se supera el límite de 15 entradas', async () => {
      const payload = {
        fechaVisita: obtenerFechaAbierta(6),
        cantidad: 10,
        visitantes: Array.from({ length: 10 }, () => ({ edad: 22, tipoPase: 'regular' })),
        pago: 'efectivo',
        userId: 1
      };

      // Primera compra: 10 entradas
      const res1 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res1.statusCode).toBe(201);

      // Segunda compra: excede el límite
      const res2 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res2.statusCode).toBe(400);
      expect(res2.body.message).toMatch(/cupo|completo|disponible/i);
    });
  });
});
