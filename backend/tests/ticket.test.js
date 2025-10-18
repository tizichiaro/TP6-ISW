// ✅ tests/ticket.test.js
import request from 'supertest';
import app from '../src/app.js';

describe('Ticket API (Compra de entradas)', () => {
  let token = null;

  beforeAll(async () => {
    const authRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'secret' });

    expect(authRes.statusCode).toBe(200);
    token = authRes.body.token;
  });

  // ================================
  // 🧱 CASOS INVÁLIDOS
  // ================================
  describe('Casos inválidos', () => {
    test('Falla si no se selecciona forma de pago', async () => {
      const payload = {
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 2,
        userId: 1,
        visitantes: [{ edad: 20 }, { edad: 25 }],
        tipoPase: 'regular'
      };
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/pago/i);
    });

    test('Falla si el parque está cerrado (lunes o martes)', async () => {
      // Lunes
      const proximoLunes = (() => {
        const hoy = new Date();
        const dia = hoy.getDay();
        const offset = (1 - dia + 7) % 7 || 7; // 1 = lunes
        hoy.setDate(hoy.getDate() + offset);
        return hoy.toISOString();
      })();

      const payloadLunes = {
        fechaVisita: proximoLunes,
        cantidad: 2,
        pago: 'efectivo',
        userId: 1,
        visitantes: [{ edad: 22 }, { edad: 30 }],
        tipoPase: 'regular'
      };
      const res1 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payloadLunes);

      expect(res1.statusCode).toBe(400);
      expect(res1.body.message).toMatch(/cerrado/i);

      // Martes
      const proximoMartes = (() => {
        const hoy = new Date();
        const dia = hoy.getDay();
        const offset = (2 - dia + 7) % 7 || 7; // 2 = martes
        hoy.setDate(hoy.getDate() + offset);
        return hoy.toISOString();
      })();

      const payloadMartes = {
        fechaVisita: proximoMartes,
        cantidad: 2,
        pago: 'efectivo',
        userId: 1,
        visitantes: [{ edad: 22 }, { edad: 30 }],
        tipoPase: 'regular'
      };
      const res2 = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payloadMartes);

      expect(res2.statusCode).toBe(400);
      expect(res2.body.message).toMatch(/cerrado/i);
    });

    test('Falla si se intenta comprar más de 10 entradas', async () => {
      const payload = {
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 15,
        pago: 'efectivo',
        userId: 1,
        visitantes: Array.from({ length: 15 }, () => ({ edad: 20 })),
        tipoPase: 'regular'
      };
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/10/i);
    });

    test('Falla si la fecha es pasada', async () => {
      const ayer = new Date(Date.now() - 86400000).toISOString();
      const payload = {
        fechaVisita: ayer,
        cantidad: 1,
        pago: 'efectivo',
        userId: 1,
        visitantes: [{ edad: 20 }],
        tipoPase: 'regular'
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
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 3,
        pago: 'efectivo',
        userId: 1,
        visitantes: [{ edad: 20 }, { edad: 25 }], // faltaría uno
        tipoPase: 'regular'
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
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 2,
        pago: 'efectivo',
        userId: 1,
        visitantes: [{ edad: 20 }, { edad: -5 }],
        tipoPase: 'regular'
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
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 1,
        pago: 'efectivo',
        userId: 1,
        visitantes: [{ edad: 20 }],
        tipoPase: 'gold'
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
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 0,
        pago: 'efectivo',
        userId: 1,
        visitantes: [],
        tipoPase: 'regular'
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
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 2,
        pago: 'efectivo',
        visitantes: [{ edad: 20 }, { edad: 25 }],
        tipoPase: 'regular'
      };
      const res = await request(app).post('/api/tickets').send(payload);
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================
  // ✅ CASOS VÁLIDOS
  // ================================
  describe('Casos válidos', () => {
    test('Compra correcta con Mercado Pago (debe devolver id y checkoutUrl)', async () => {
      const payload = {
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 3,
        visitantes: [{ edad: 25 }, { edad: 30 }, { edad: 5 }],
        tipoPase: 'regular',
        pago: 'mercado_pago',
        userId: 1
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('fechaVisita');
      expect(res.body).toHaveProperty('cantidad', 3);
      expect(res.body).toHaveProperty('checkoutUrl');
      expect(res.body).toHaveProperty('emailSent');
    });

    test('Compra correcta con pago en efectivo (sin checkoutUrl)', async () => {
      const payload = {
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 2,
        visitantes: [{ edad: 18 }, { edad: 40 }],
        tipoPase: 'vip',
        pago: 'efectivo',
        userId: 1
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('cantidad', 2);
      expect(res.body).not.toHaveProperty('checkoutUrl');
      expect(res.body).toHaveProperty('emailSent');
    });

    test('Permite compra con fecha de hoy', async () => {
      const hoy = new Date().toISOString();
      const payload = {
        fechaVisita: hoy,
        cantidad: 1,
        visitantes: [{ edad: 28 }],
        tipoPase: 'regular',
        pago: 'efectivo',
        userId: 1
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('id');
    });

    test('Compra válida con exactamente 10 entradas (borde)', async () => {
      const payload = {
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 10,
        visitantes: Array.from({ length: 10 }, () => ({ edad: 22 })),
        tipoPase: 'regular',
        pago: 'efectivo',
        userId: 1
      };

      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('cantidad', 10);
    });
  });
});
