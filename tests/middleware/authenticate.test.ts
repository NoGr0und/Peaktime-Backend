import { test, expect, vi, beforeEach } from 'vitest';
import { authenticate } from '../../src/middleware/authenticate.js';
import { supabase } from '../../src/lib/supabase.js';
import { prisma } from '../../src/lib/prisma.js';

beforeEach(() => {
  vi.restoreAllMocks();
  // Mock the prisma.user object because setup.ts mocks prisma as a plain empty object
  prisma.user = {
    findUnique: vi.fn()
  } as any;
});

test('authenticate throws AppError if no token', async () => {
  const req: any = { headers: {} };
  
  await expect(authenticate(req)).rejects.toThrow('No authorization header');
});

test('authenticate throws AppError if token invalid', async () => {
  const req: any = { headers: { authorization: 'Bearer bad-token' } };
  vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: null }, error: new Error('bad token') } as any);
  
  await expect(authenticate(req)).rejects.toThrow('Invalid token');
});

test('authenticate throws AppError if user is not in the database', async () => {
  const req: any = { headers: { authorization: 'Bearer valid-token' } };
  vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'supabase-id' } }, error: null } as any);
  vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

  await expect(authenticate(req)).rejects.toThrow('User not synced in local database');
});

test('authenticate successfully sets user from database', async () => {
  const req: any = { headers: { authorization: 'Bearer valid-token' } };
  vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: { id: 'supabase-id' } }, error: null } as any);
  
  const mockDbUser = { id: 'local-id', name: 'João Silva', role: 'ALUNO' };
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockDbUser as any);

  await authenticate(req);

  expect(req.user).toEqual(mockDbUser);
  expect(prisma.user.findUnique).toHaveBeenCalledWith({
    where: { supabaseId: 'supabase-id' }
  });
});
