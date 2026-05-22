# Enrollment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Enrollment sub-project. Allows Professors to generate invite codes and Students to use these codes to link their accounts.

**Architecture:** Fastify plugin architecture. Prisma used for database operations. TDD approach using Vitest.

**Tech Stack:** Fastify, Vitest, Zod, Prisma

---

### Task 1: Enrollment Service (Invite Code Generation)

**Files:**
- Create: `tests/plugins/enrollment/enrollment.service.test.ts`
- Create: `src/plugins/enrollment/enrollment.service.ts`

- [ ] **Step 1: Write failing test for generating invite**

```typescript
// tests/plugins/enrollment/enrollment.service.test.ts
import { test, expect, vi, beforeEach } from 'vitest';
import { EnrollmentService } from '../../../src/plugins/enrollment/enrollment.service.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    inviteCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    enrollment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('generateInviteCode creates and returns a 6-char code', async () => {
  const mockCode = { id: 'uuid', code: 'ABC123', professorId: 'prof-id', expiresAt: new Date() };
  vi.mocked(prisma.inviteCode.create).mockResolvedValue(mockCode as any);

  const result = await EnrollmentService.generateInviteCode('prof-id');
  expect(result.code).toHaveLength(6);
  expect(prisma.inviteCode.create).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
npx vitest run tests/plugins/enrollment/enrollment.service.test.ts
```

- [ ] **Step 3: Create Prisma client singleton (if missing)**
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

- [ ] **Step 4: Write minimal implementation**

```typescript
// src/plugins/enrollment/enrollment.service.ts
import { prisma } from '../../lib/prisma.js';
import crypto from 'crypto';
import { AppError } from '../../lib/errors.js';

export const EnrollmentService = {
  async generateInviteCode(professorId: string) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Expires in 48h

    return prisma.inviteCode.create({
      data: {
        code,
        professorId,
        expiresAt,
      }
    });
  }
};
```

- [ ] **Step 5: Run test to verify it passes**
```bash
npx vitest run tests/plugins/enrollment/enrollment.service.test.ts
```

- [ ] **Step 6: Commit**
```bash
git add tests/plugins/enrollment src/plugins/enrollment src/lib/prisma.ts
git commit -m "feat: add enrollment service invite generation"
```

---

### Task 2: Enrollment Service (Join & Queries)

**Files:**
- Modify: `tests/plugins/enrollment/enrollment.service.test.ts`
- Modify: `src/plugins/enrollment/enrollment.service.ts`

- [ ] **Step 1: Write tests for join logic**

```typescript
// Add to tests/plugins/enrollment/enrollment.service.test.ts

test('joinWithCode throws if code not found', async () => {
  vi.mocked(prisma.inviteCode.findUnique).mockResolvedValue(null);
  await expect(EnrollmentService.joinWithCode('student-id', 'BADCOD')).rejects.toThrow('Invalid or expired code');
});

test('joinWithCode creates enrollment', async () => {
  const mockCode = { id: 'code-id', code: 'ABC123', professorId: 'prof-id', expiresAt: new Date(Date.now() + 10000) };
  vi.mocked(prisma.inviteCode.findUnique).mockResolvedValue(mockCode as any);
  vi.mocked(prisma.enrollment.create).mockResolvedValue({ id: 'enr-id' } as any);

  const result = await EnrollmentService.joinWithCode('student-id', 'ABC123');
  expect(result.id).toBe('enr-id');
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
npx vitest run tests/plugins/enrollment/enrollment.service.test.ts
```

- [ ] **Step 3: Implement join logic and queries**

```typescript
// Add to src/plugins/enrollment/enrollment.service.ts

  async joinWithCode(studentId: string, code: string) {
    const invite = await prisma.inviteCode.findUnique({ where: { code } });
    
    if (!invite || invite.expiresAt < new Date()) {
      throw new AppError(400, 'INVALID_CODE', 'Invalid or expired code');
    }

    try {
      return await prisma.enrollment.create({
        data: {
          professorId: invite.professorId,
          studentId,
          inviteCodeId: invite.id
        }
      });
    } catch (error) {
      throw new AppError(409, 'ALREADY_ENROLLED', 'Student is already enrolled');
    }
  },

  async getStudents(professorId: string) {
    return prisma.enrollment.findMany({
      where: { professorId, active: true },
      include: { student: true }
    });
  },

  async getProfessor(studentId: string) {
    return prisma.enrollment.findFirst({
      where: { studentId, active: true },
      include: { professor: true }
    });
  },

  async unenroll(enrollmentId: string, userId: string, role: string) {
    const enrollment = await prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new AppError(404, 'NOT_FOUND', 'Enrollment not found');

    if (role === 'PROFESSOR' && enrollment.professorId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot remove this student');
    }
    if (role === 'ALUNO' && enrollment.studentId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Cannot remove this enrollment');
    }

    return prisma.enrollment.delete({ where: { id: enrollmentId } });
  }
```

- [ ] **Step 4: Run test to verify it passes**
```bash
npx vitest run tests/plugins/enrollment/enrollment.service.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/plugins/enrollment/enrollment.service.ts tests/plugins/enrollment/enrollment.service.test.ts
git commit -m "feat: complete enrollment service logic"
```

---

### Task 3: Enrollment Routes & Plugin

**Files:**
- Create: `tests/plugins/enrollment/enrollment.routes.test.ts`
- Create: `src/plugins/enrollment/enrollment.schema.ts`
- Create: `src/plugins/enrollment/enrollment.routes.ts`
- Create: `src/plugins/enrollment/enrollment.plugin.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Write integration test**

```typescript
// tests/plugins/enrollment/enrollment.routes.test.ts
import { test, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { EnrollmentService } from '../../../src/plugins/enrollment/enrollment.service.js';

// Mock authenticate middleware
vi.mock('../../../src/middleware/authenticate.js', () => ({
  authenticate: async (req: any) => {
    req.user = { id: 'prof-id', role: 'PROFESSOR' }; // fake user
  }
}));

test('POST /api/enrollment/invite creates invite', async () => {
  const app = await buildApp();
  
  vi.spyOn(EnrollmentService, 'generateInviteCode').mockResolvedValue({
    id: 'code-id', code: 'ABC123', professorId: 'prof-id', expiresAt: new Date(), createdAt: new Date()
  });

  const response = await supertest(app.server)
    .post('/api/enrollment/invite')
    .set('Authorization', 'Bearer token');

  expect(response.status).toBe(200);
  expect(response.body.code).toBe('ABC123');
});
```

- [ ] **Step 2: Create schemas**

```typescript
// src/plugins/enrollment/enrollment.schema.ts
import z from 'zod';

export const joinSchema = z.object({
  code: z.string().length(6),
});
```

- [ ] **Step 3: Create routes**

```typescript
// src/plugins/enrollment/enrollment.routes.ts
import { FastifyInstance } from 'fastify';
import { EnrollmentService } from './enrollment.service.js';
import { joinSchema } from './enrollment.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { AppError } from '../../lib/errors.js';

export async function enrollmentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', authenticate);

  fastify.post('/invite', async (request, reply) => {
    const user: any = (request as any).user;
    if (user.role !== 'PROFESSOR') throw new AppError(403, 'FORBIDDEN', 'Professors only');
    
    const result = await EnrollmentService.generateInviteCode(user.id);
    return reply.send(result);
  });

  fastify.post('/join', async (request, reply) => {
    const user: any = (request as any).user;
    if (user.role !== 'ALUNO') throw new AppError(403, 'FORBIDDEN', 'Students only');

    const { code } = joinSchema.parse(request.body);
    const result = await EnrollmentService.joinWithCode(user.id, code);
    return reply.send(result);
  });

  fastify.get('/students', async (request, reply) => {
    const user: any = (request as any).user;
    const result = await EnrollmentService.getStudents(user.id);
    return reply.send(result);
  });

  fastify.get('/professor', async (request, reply) => {
    const user: any = (request as any).user;
    const result = await EnrollmentService.getProfessor(user.id);
    return reply.send(result);
  });
}
```

- [ ] **Step 4: Create plugin and register**

```typescript
// src/plugins/enrollment/enrollment.plugin.ts
import { FastifyInstance } from 'fastify';
import { enrollmentRoutes } from './enrollment.routes.js';

export default async function enrollmentPlugin(fastify: FastifyInstance) {
  fastify.register(enrollmentRoutes, { prefix: '/api/enrollment' });
}
```

```typescript
// Update src/app.ts
import enrollmentPlugin from './plugins/enrollment/enrollment.plugin.js';
// ...
app.register(enrollmentPlugin);
```

- [ ] **Step 5: Run tests to verify**
```bash
npx vitest run tests/plugins/enrollment/enrollment.routes.test.ts
```

- [ ] **Step 6: Commit**
```bash
git add src/plugins/enrollment src/app.ts tests/plugins/enrollment
git commit -m "feat: add enrollment routes and integration"
```
