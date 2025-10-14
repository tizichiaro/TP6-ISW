import request from 'supertest';
import app from '../src/app.js';

describe('Ticket API (Compra de entradas)', () => {

  describe('Casos inválidos', () => {
    test('Falla si no se selecciona forma de pago', async () => {
      const payload = {
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 2,
        userId: 1
      };
      const res = await request(app).post('/api/tickets').send(payload);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/Faltan/i);
    });

    test('Falla si se elige un día que el parque está cerrado (martes)', async () => {
      const proximoMartes = (() => {
        const hoy = new Date();
        const dia = hoy.getDay();
        const offset = (2 - dia + 7) % 7 || 7; // próximo martes
        hoy.setDate(hoy.getDate() + offset);
        return hoy.toISOString();
      })();

      const payload = {
        fechaVisita: proximoMartes,
        cantidad: 2,
        pago: 'efectivo',
        userId: 1
      };
      const res = await request(app).post('/api/tickets').send(payload);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/cerrado/i);
    });

    test('Falla si se intenta comprar más de 10 entradas', async () => {
      const payload = {
        fechaVisita: new Date(Date.now() + 86400000).toISOString(),
        cantidad: 15,
        pago: 'efectivo',
        userId: 1
      };
      const res = await request(app).post('/api/tickets').send(payload);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/10/i);
    });
  });

  describe('Casos válidos', () => {
    test('Compra correcta con datos válidos', async () => {
      const payload = {
        fechaVisita: new Date(Date.now() + 86400000).toISOString(), // mañana
        cantidad: 3,
        visitantes: [
          { edad: 25 },
          { edad: 30 },
          { edad: 5 }
        ],
        tipoPase: 'regular',
        pago: 'mercado_pago',
        userId: 1
      };

      const res = await request(app).post('/api/tickets').send(payload);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
    });
  });
});
