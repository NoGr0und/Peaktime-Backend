# Infra & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setup test infrastructure with Vitest, configure Prisma schema for User/Role, and implement Supabase Auth login endpoint via a Fastify plugin using TDD.

**Architecture:** Fastify plugin architecture. Supabase for auth/JWT generation. Prisma for User profile. TDD approach using Vitest.

**Tech Stack:** Fastify, Vitest, Zod, Prisma, Supabase

---

### Task 1: Project Setup & Dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install zod @supabase/supabase-js
npm install -D vitest supertest @types/supertest
```

- [ ] **Step 2: Create Vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
```

- [ ] **Step 3: Update scripts in package.json**

Change the `test` script in `package.json` to `"test": "vitest run"`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: setup vitest and install dependencies"
```

---

### Task 2: Prisma Schema & Types

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update schema**

Replace the current `User` model with the updated one from the spec.

```prisma
// prisma/schema.prisma
// (Keep existing generator and datasource)

model User {
  id            String   @id @default(uuid())
  supabaseId    String   @unique
  name          String
  email         String   @unique
  phone         String?
  birthDate     DateTime
  avatarUrl     String?
  role          Role     @default(ALUNO)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum Role { 
  PROFESSOR 
  ALUNO 
}
```

- [ ] **Step 2: Run Prisma generate**

```bash
npx prisma generate
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: update user schema for auth"
```

---

### Task 3: Setup Test Helper

**Files:**
- Create: `tests/helpers/setup.ts`

- [ ] **Step 1: Create the test app helper**

```typescript
// tests/helpers/setup.ts
import fastify from 'fastify';
import { app } from '../../src/app.js';

export const buildApp = async () => {
  await app.ready();
  return app;
};
```

- [ ] **Step 2: Commit**

```bash
git add tests/helpers/setup.ts
git commit -m "test: add test app helper"
```

---

### Task 4: Supabase Client & Error Utils

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/errors.ts`

- [ ] **Step 1: Create Supabase client**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'fake-key-for-tests';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

- [ ] **Step 2: Create Error utils**

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts src/lib/errors.ts
git commit -m "feat: add supabase client and error utils"
```

---

### Task 5: Auth Middleware

**Files:**
- Create: `tests/middleware/authenticate.test.ts`
- Create: `src/middleware/authenticate.ts`

- [ ] **Step 1: Write failing test for authenticate**

```typescript
// tests/middleware/authenticate.test.ts
import { test, expect, vi } from 'vitest';
import { authenticate } from '../../src/middleware/authenticate.js';
import { supabase } from '../../src/lib/supabase.js';

test('authenticate throws AppError if no token', async () => {
  const req: any = { headers: {} };
  
  await expect(authenticate(req)).rejects.toThrow('No authorization header');
});

test('authenticate throws AppError if token invalid', async () => {
  const req: any = { headers: { authorization: 'Bearer bad-token' } };
  vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({ data: { user: null }, error: new Error('bad token') } as any);
  
  await expect(authenticate(req)).rejects.toThrow('Invalid token');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/middleware/authenticate.test.ts
```
Expected: FAIL "authenticate is not a function"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/middleware/authenticate.ts
import { FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';
import { supabase } from '../lib/supabase.js';

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

  (request as any).user = data.user;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/middleware/authenticate.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/middleware/authenticate.test.ts src/middleware/authenticate.ts
git commit -m "feat: add authenticate middleware"
```

---

### Task 6: Auth Service

**Files:**
- Create: `tests/plugins/auth/auth.service.test.ts`
- Create: `src/plugins/auth/auth.service.ts`

- [ ] **Step 1: Write failing test for login**

```typescript
// tests/plugins/auth/auth.service.test.ts
import { test, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../../src/plugins/auth/auth.service.js';
import { supabase } from '../../../src/lib/supabase.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('login returns session on success', async () => {
  vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
    data: { session: { access_token: 'fake-jwt', refresh_token: 'fake-refresh' }, user: {} },
    error: null,
  } as any);

  const result = await AuthService.login('test@test.com', 'password123');
  expect(result.access_token).toBe('fake-jwt');
});

test('login throws Error on failure', async () => {
  vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({
    data: { session: null, user: null },
    error: { message: 'Invalid credentials' } as any,
  });

  await expect(AuthService.login('test@test.com', 'bad')).rejects.toThrow('Invalid credentials');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/plugins/auth/auth.service.test.ts
```
Expected: FAIL "AuthService is not defined"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/plugins/auth/auth.service.ts
import { supabase } from '../../lib/supabase.js';
import { AppError } from '../../lib/errors.js';

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
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/plugins/auth/auth.service.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/plugins/auth/auth.service.test.ts src/plugins/auth/auth.service.ts
git commit -m "feat: add auth service login"
```

---

### Task 7: Auth Routes and Plugin

**Files:**
- Create: `tests/plugins/auth/auth.routes.test.ts`
- Create: `src/plugins/auth/auth.schema.ts`
- Create: `src/plugins/auth/auth.routes.ts`
- Create: `src/plugins/auth/auth.plugin.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Write failing integration test for routes**

```typescript
// tests/plugins/auth/auth.routes.test.ts
import { test, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { supabase } from '../../../src/lib/supabase.js';

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/plugins/auth/auth.routes.test.ts
```
Expected: FAIL 404 Not Found

- [ ] **Step 3: Write Schemas**

```typescript
// src/plugins/auth/auth.schema.ts
import z from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
```

- [ ] **Step 4: Write Routes and Plugin**

```typescript
// src/plugins/auth/auth.routes.ts
import { FastifyInstance } from 'fastify';
import { AuthService } from './auth.service.js';
import { loginSchema } from './auth.schema.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
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
}
```

```typescript
// src/plugins/auth/auth.plugin.ts
import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';

export default async function authPlugin(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/api/auth' });
}
```

- [ ] **Step 5: Register Plugin in App**

```typescript
// src/app.ts
import fastify from 'fastify';
import authPlugin from './plugins/auth/auth.plugin.js';

const app = fastify({ logger: true });

app.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

app.register(authPlugin);

export { app };
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run tests/plugins/auth/auth.routes.test.ts
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/plugins/auth src/app.ts tests/plugins/auth/auth.routes.test.ts
git commit -m "feat: add auth routes and plugin"
```
