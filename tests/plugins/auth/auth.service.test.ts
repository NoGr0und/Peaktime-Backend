import { test, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../src/plugins/auth/auth.service.js';
import { supabase } from '../../../src/lib/supabase.js';
import { prisma } from '../../../src/lib/prisma.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('login returns session on success', async () => {
  vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
    data: { session: { access_token: 'fake-jwt', refresh_token: 'fake-refresh' }, user: { id: 'supabase-uid-123' } },
    error: null,
  } as any);

  prisma.user = {
    findUnique: vi.fn().mockResolvedValue({
      id: 'local-uuid-123',
      name: 'João Professor',
      email: 'test@test.com',
      role: 'PROFESSOR',
      birthDate: new Date('1990-01-01'),
      phone: '11999999999',
      avatarUrl: 'https://example.com/avatar.jpg'
    })
  } as any;

  const result = await AuthService.login('test@test.com', 'password123');
  expect(result.access_token).toBe('fake-jwt');
  expect(result.user.name).toBe('João Professor');
});

test('login throws Error on failure', async () => {
  vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
    data: { session: null, user: null },
    error: { message: 'Invalid credentials' } as any,
  });

  await expect(AuthService.login('test@test.com', 'bad')).rejects.toThrow('Invalid credentials');
});

test('register successfully signs up in Supabase and creates user in database', async () => {
  // Mock local DB email check (no user found)
  prisma.user = {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      id: 'local-uuid-123',
      name: 'João Professor',
      email: 'prof@test.com',
      role: 'PROFESSOR',
      birthDate: new Date('1990-01-01'),
      phone: '11999999999',
      avatarUrl: 'https://example.com/avatar.jpg'
    })
  } as any;

  // Mock Supabase signUp
  vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
    data: {
      user: { id: 'supabase-uuid-123' },
      session: { access_token: 'fake-jwt', refresh_token: 'fake-refresh' }
    },
    error: null,
  } as any);

  const result = await AuthService.register({
    email: 'prof@test.com',
    password: 'password123',
    name: 'João Professor',
    birthDate: '1990-01-01',
    phone: '11999999999',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'PROFESSOR'
  });

  expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'prof@test.com' } });
  expect(supabase.auth.signUp).toHaveBeenCalledWith({ email: 'prof@test.com', password: 'password123' });
  expect(prisma.user.create).toHaveBeenCalledWith({
    data: {
      supabaseId: 'supabase-uuid-123',
      email: 'prof@test.com',
      name: 'João Professor',
      birthDate: new Date('1990-01-01'),
      phone: '11999999999',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'PROFESSOR'
    }
  });
  expect(result.user.id).toBe('local-uuid-123');
  expect(result.session?.access_token).toBe('fake-jwt');
});

test('register throws Error if email already exists in local database', async () => {
  prisma.user = {
    findUnique: vi.fn().mockResolvedValue({ id: 'existing-id' }),
  } as any;

  await expect(
    AuthService.register({
      email: 'existing@test.com',
      password: 'password123',
      name: 'Existing User',
      birthDate: '1990-01-01',
      role: 'ALUNO'
    })
  ).rejects.toThrow('Email is already registered');

  expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'existing@test.com' } });
});

test('register throws Error if Supabase sign up fails', async () => {
  prisma.user = {
    findUnique: vi.fn().mockResolvedValue(null),
  } as any;

  vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({
    data: { user: null, session: null },
    error: { message: 'Password too weak' } as any,
  });

  await expect(
    AuthService.register({
      email: 'new@test.com',
      password: 'weak',
      name: 'New User',
      birthDate: '1990-01-01',
      role: 'ALUNO'
    })
  ).rejects.toThrow('Password too weak');
});

