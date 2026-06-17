import { test, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { AuthService } from '../../../src/plugins/auth/auth.service.js';

test('POST /api/auth/login returns 200 and tokens', async () => {
  const app = await buildApp();
  await app.ready();
  
  const mockLoginResult = {
    access_token: 'jwt-123',
    refresh_token: 'refresh-123',
    user: {
      id: 'local-uuid-123',
      name: 'João Professor',
      email: 'test@test.com',
      role: 'PROFESSOR',
      birthDate: '1990-01-01T00:00:00.000Z',
      phone: '11999999999',
      avatarUrl: 'https://example.com/avatar.jpg'
    }
  };

  vi.spyOn(AuthService, 'login').mockResolvedValue(mockLoginResult as any);

  const response = await supertest(app.server)
    .post('/api/auth/login')
    .send({ email: 'test@test.com', password: 'password123' });

  expect(response.status).toBe(200);
  expect(response.body.access_token).toBe('jwt-123');
  expect(response.body.user.name).toBe('João Professor');
});

test('POST /api/auth/register returns 200 and user data', async () => {
  const app = await buildApp();
  await app.ready();

  const mockRegisterResult = {
    user: {
      id: 'local-uuid-123',
      name: 'João Professor',
      email: 'prof@test.com',
      role: 'PROFESSOR',
      birthDate: '1990-01-01T00:00:00.000Z',
      phone: '11999999999',
      avatarUrl: 'https://example.com/avatar.jpg'
    },
    session: {
      access_token: 'fake-jwt',
      refresh_token: 'fake-refresh'
    }
  };

  vi.spyOn(AuthService, 'register').mockResolvedValue(mockRegisterResult as any);

  const response = await supertest(app.server)
    .post('/api/auth/register')
    .send({
      email: 'prof@test.com',
      password: 'password123',
      name: 'João Professor',
      birthDate: '1990-01-01T00:00:00.000Z',
      phone: '11999999999',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'PROFESSOR'
    });

  expect(response.status).toBe(200);
  expect(response.body).toEqual(mockRegisterResult);
  expect(AuthService.register).toHaveBeenCalledWith({
    email: 'prof@test.com',
    password: 'password123',
    name: 'João Professor',
    birthDate: '1990-01-01T00:00:00.000Z',
    phone: '11999999999',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'PROFESSOR'
  });
});

test('POST /api/auth/register returns 400 on validation failure', async () => {
  const app = await buildApp();
  await app.ready();

  const response = await supertest(app.server)
    .post('/api/auth/register')
    .send({
      email: 'invalid-email',
      password: '123'
    });

  expect(response.status).toBe(400);
  expect(response.body.error).toBe('Validation Error');
});
