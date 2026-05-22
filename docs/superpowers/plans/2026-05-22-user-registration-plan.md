# User Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a user registration API endpoint (`POST /api/auth/register`) synchronizing Supabase Auth with the local database and updating the authentication middleware to resolve local user records.

**Architecture:** Add a register route to Fastify's auth plugin, validate requests with Zod, verify existing emails, call Supabase Auth signUp, insert records into local PostgreSQL via Prisma, and update `authenticate.ts` middleware to lookup database users by `supabaseId`.

**Tech Stack:** TypeScript, Fastify, Supabase Auth, Prisma ORM, PostgreSQL, Zod, Vitest.

---

### Task 1: Update Authentication Middleware and Tests

**Files:**
- Modify: [authenticate.ts](file:///c:/Users/joaov/OneDrive/Documentos/GitHub/Peaktime%20Backend/src/middleware/authenticate.ts)
- Modify: [authenticate.test.ts](file:///c:/Users/joaov/OneDrive/Documentos/GitHub/Peaktime%20Backend/tests/middleware/authenticate.test.ts)

- [ ] **Step 1: Update tests in `tests/middleware/authenticate.test.ts` to mock prisma and test new scenarios**

Change the contents of `tests/middleware/authenticate.test.ts` to:
```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test`
Expected output: The newly added tests (`throws AppError if user is not in the database`, `successfully sets user from database`) fail with `TypeError: Cannot read properties of undefined (reading 'findUnique')` or similar, because the middleware does not yet call `prisma.user.findUnique`.

- [ ] **Step 3: Implement database resolution in `src/middleware/authenticate.ts`**

Update `src/middleware/authenticate.ts` to:
```typescript
import type { FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';
import { supabase } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

export const authenticate = async (request: FastifyRequest) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new AppError(401, 'UNAUTHORIZED', 'No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: data.user.id }
  });

  if (!dbUser) {
    throw new AppError(401, 'UNAUTHORIZED', 'User not synced in local database');
  }

  (request as any).user = dbUser;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test`
Expected output: All tests pass.

- [ ] **Step 5: Commit changes**

Run:
```bash
git add src/middleware/authenticate.ts tests/middleware/authenticate.test.ts
git commit -m "feat(auth): update authentication middleware to resolve local db user"
```

---

### Task 2: Create Registration Schema

**Files:**
- Modify: [auth.schema.ts](file:///c:/Users/joaov/OneDrive/Documentos/GitHub/Peaktime%20Backend/src/plugins/auth/auth.schema.ts)

- [ ] **Step 1: Add `registerSchema` validation schema in `src/plugins/auth/auth.schema.ts`**

Change the contents of `src/plugins/auth/auth.schema.ts` to:
```typescript
import z from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  avatarUrl: z.string().url().optional(),
  role: z.enum(['PROFESSOR', 'ALUNO']),
});
```

- [ ] **Step 2: Commit schema changes**

Run:
```bash
git add src/plugins/auth/auth.schema.ts
git commit -m "feat(auth): add register validation schema"
```

---

### Task 3: Implement Auth Service Registration Method

**Files:**
- Modify: [auth.service.ts](file:///c:/Users/joaov/OneDrive/Documentos/GitHub/Peaktime%20Backend/src/plugins/auth/auth.service.ts)
- Modify: [auth.service.test.ts](file:///c:/Users/joaov/OneDrive/Documentos/GitHub/Peaktime%20Backend/tests/plugins/auth/auth.service.test.ts)

- [ ] **Step 1: Write unit tests in `tests/plugins/auth/auth.service.test.ts` for registration**

Append the following tests to `tests/plugins/auth/auth.service.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run tests to verify registration tests fail**

Run: `npm run test`
Expected: The new tests fail with `TypeError: AuthService.register is not a function`.

- [ ] **Step 3: Implement `register` method in `src/plugins/auth/auth.service.ts`**

Update `src/plugins/auth/auth.service.ts` to:
```typescript
import { supabase } from '../../lib/supabase.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';

export const AuthService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AppError(401, 'AUTH_FAILED', error.message);
    }

    if (!data.session) {
      throw new AppError(401, 'AUTH_FAILED', 'No session returned');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    };
  },

  async register(data: {
    email: string;
    password?: string;
    name: string;
    birthDate: string;
    phone?: string;
    avatarUrl?: string;
    role: 'PROFESSOR' | 'ALUNO';
  }) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    
    if (existingUser) {
      throw new AppError(400, 'USER_ALREADY_EXISTS', 'Email is already registered');
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password!,
    });

    if (authError || !authData.user) {
      throw new AppError(400, 'REGISTRATION_FAILED', authError?.message || 'Failed to sign up in Supabase');
    }

    try {
      const dbUser = await prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          email: data.email,
          name: data.name,
          birthDate: new Date(data.birthDate),
          phone: data.phone || null,
          avatarUrl: data.avatarUrl || null,
          role: data.role,
        }
      });

      return {
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          birthDate: dbUser.birthDate,
          phone: dbUser.phone,
          avatarUrl: dbUser.avatarUrl,
        },
        session: authData.session ? {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        } : null,
      };
    } catch (dbError: any) {
      throw new AppError(500, 'DATABASE_ERROR', dbError.message || 'Failed to create user in database');
    }
  }
};
```

- [ ] **Step 4: Run tests to verify all tests pass**

Run: `npm run test`
Expected: All 20 tests pass.

- [ ] **Step 5: Commit changes**

Run:
```bash
git add src/plugins/auth/auth.service.ts tests/plugins/auth/auth.service.test.ts
git commit -m "feat(auth): implement register logic in AuthService"
```

---

### Task 4: Add Register Route to Auth Plugin

**Files:**
- Modify: [auth.routes.ts](file:///c:/Users/joaov/OneDrive/Documentos/GitHub/Peaktime%20Backend/src/plugins/auth/auth.routes.ts)
- Modify: [auth.routes.test.ts](file:///c:/Users/joaov/OneDrive/Documentos/GitHub/Peaktime%20Backend/tests/plugins/auth/auth.routes.test.ts)

- [ ] **Step 1: Write integration tests in `tests/plugins/auth/auth.routes.test.ts` for POST `/api/auth/register`**

Modify `tests/plugins/auth/auth.routes.test.ts` to add registration tests:
```typescript
import { test, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { supabase } from '../../../src/lib/supabase.js';
import { AuthService } from '../../../src/plugins/auth/auth.service.js';

test('POST /api/auth/login returns 200 and tokens', async () => {
  const app = await buildApp();
  await app.ready();
  
  vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
    data: { session: { access_token: 'jwt-123', refresh_token: 'refresh-123' }, user: {} },
    error: null,
  } as any);

  const response = await supertest(app.server)
    .post('/api/auth/login')
    .send({ email: 'test@test.com', password: 'password123' });

  expect(response.status).toBe(200);
  expect(response.body.access_token).toBe('jwt-123');
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
```

- [ ] **Step 2: Run tests to verify new route tests fail**

Run: `npm run test`
Expected: The new registration route tests fail with 404 (Not Found) status for POST `/api/auth/register`.

- [ ] **Step 3: Register POST `/register` route in `src/plugins/auth/auth.routes.ts`**

Update `src/plugins/auth/auth.routes.ts` to:
```typescript
import type { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.schema.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login com email e senha',
      description: 'Autentica o usuário via Supabase e retorna tokens JWT.',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'aluno@email.com' },
          password: { type: 'string', minLength: 6, example: 'senha123' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        401: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);
      const result = await AuthService.login(email, password);
      return reply.send(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation Error', details: err.errors });
      }
      return reply.status(err.statusCode || 500).send({ error: err.message });
    }
  });

  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Registro de novo usuário',
      description: 'Cadastra um novo aluno ou professor no Supabase e no banco de dados local.',
      body: {
        type: 'object',
        required: ['email', 'password', 'name', 'birthDate', 'role'],
        properties: {
          email: { type: 'string', format: 'email', example: 'aluno@email.com' },
          password: { type: 'string', minLength: 6, example: 'senha123' },
          name: { type: 'string', example: 'João Silva' },
          birthDate: { type: 'string', format: 'date-time', example: '1995-10-25T00:00:00.000Z' },
          role: { type: 'string', enum: ['PROFESSOR', 'ALUNO'], example: 'ALUNO' },
          phone: { type: 'string', example: '11999999999' },
          avatarUrl: { type: 'string', format: 'uri', example: 'https://example.com/avatar.jpg' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                birthDate: { type: 'string' },
                phone: { type: 'string', nullable: true },
                avatarUrl: { type: 'string', nullable: true },
              },
            },
            session: {
              type: 'object',
              nullable: true,
              properties: {
                access_token: { type: 'string' },
                refresh_token: { type: 'string' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
        500: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      const result = await AuthService.register(data);
      return reply.send(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        return reply.status(400).send({ error: 'Validation Error', details: err.errors });
      }
      return reply.status(err.statusCode || 500).send({ error: err.message });
    }
  });
}
```

- [ ] **Step 4: Run tests to verify everything passes**

Run: `npm run test`
Expected: All 22 tests pass successfully.

- [ ] **Step 5: Commit changes**

Run:
```bash
git add src/plugins/auth/auth.routes.ts tests/plugins/auth/auth.routes.test.ts
git commit -m "feat(auth): add register route to auth plugin"
```
