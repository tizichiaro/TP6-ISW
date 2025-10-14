import request from 'supertest';
import app from '../src/app.js';

describe('User API', () => {
  test('GET /api/users devuelve lista de usuarios', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Al menos los 2 de seed
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/users crea un usuario', async () => {
    const payload = { name: 'Grace Hopper', email: 'grace@example.com' };
    const res = await request(app).post('/api/users').send(payload);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject(payload);
    expect(res.body.id).toBeDefined();
  });

  test('POST /api/users valida campos obligatorios', async () => {
    const res = await request(app).post('/api/users').send({ name: 'SinEmail' });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/obligatorios/i);
  });
});
