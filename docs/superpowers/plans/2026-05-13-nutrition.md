# Nutrition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Nutrition sub-project. Allows students to log meals, retrieve their daily meal summary, and search for food items via the Open Food Facts API.

**Architecture:** Fastify plugin architecture. Prisma used for database operations. Open Food Facts HTTP API used for food search. TDD approach using Vitest.

**Tech Stack:** Fastify, Vitest, Zod, Prisma, Native fetch API

---

### Task 1: Nutrition Service (Open Food Facts Integration)

**Files:**
- Create: `tests/plugins/nutrition/nutrition.service.test.ts`
- Create: `src/plugins/nutrition/nutrition.service.ts`

- [ ] **Step 1: Write failing test for food search**

```typescript
// tests/plugins/nutrition/nutrition.service.test.ts
import { test, expect, vi, beforeEach } from 'vitest';
import { NutritionService } from '../../../src/plugins/nutrition/nutrition.service.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    meal: { create: vi.fn(), findMany: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
  }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

test('searchFood returns parsed results from Open Food Facts', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      products: [
        { product_name: 'Arroz', nutriments: { 'energy-kcal_100g': 130, proteins_100g: 2.7, carbohydrates_100g: 28, fat_100g: 0.3 } }
      ]
    })
  } as any);

  const results = await NutritionService.searchFood('Arroz');
  expect(results[0].name).toBe('Arroz');
  expect(results[0].caloriesPer100g).toBe(130);
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
npx vitest run tests/plugins/nutrition/nutrition.service.test.ts
```

- [ ] **Step 3: Implement Search Logic**

```typescript
// src/plugins/nutrition/nutrition.service.ts
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

export const NutritionService = {
  async searchFood(query: string) {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`);
    
    if (!response.ok) {
      throw new AppError(502, 'API_ERROR', 'Failed to fetch food data');
    }

    const data: any = await response.json();
    return data.products.map((p: any) => ({
      name: p.product_name,
      caloriesPer100g: p.nutriments?.['energy-kcal_100g'] || 0,
      proteinPer100g: p.nutriments?.proteins_100g || 0,
      carbsPer100g: p.nutriments?.carbohydrates_100g || 0,
      fatPer100g: p.nutriments?.fat_100g || 0
    })).filter((p: any) => p.name);
  },
  
  // Stubs for next task
  async createMeal() {},
  async getMeals() {},
  async deleteMeal() {}
};
```

- [ ] **Step 4: Run test to verify it passes**
```bash
npx vitest run tests/plugins/nutrition/nutrition.service.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add tests/plugins/nutrition src/plugins/nutrition
git commit -m "feat: add food search via open food facts"
```

---

### Task 2: Nutrition Service (Meals CRUD)

**Files:**
- Modify: `tests/plugins/nutrition/nutrition.service.test.ts`
- Modify: `src/plugins/nutrition/nutrition.service.ts`

- [ ] **Step 1: Write failing tests for meals**

```typescript
// Add to tests/plugins/nutrition/nutrition.service.test.ts

test('createMeal creates a meal with items', async () => {
  vi.mocked(prisma.meal.create).mockResolvedValue({ id: 'meal-1' } as any);

  const result = await NutritionService.createMeal('stu-1', {
    type: 'LUNCH',
    date: new Date('2026-05-13'),
    items: [{ name: 'Arroz', quantity: 100, unit: 'g' }]
  });

  expect(result.id).toBe('meal-1');
  expect(prisma.meal.create).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
npx vitest run tests/plugins/nutrition/nutrition.service.test.ts
```

- [ ] **Step 3: Implement Meals Logic**

```typescript
// Replace stubs in src/plugins/nutrition/nutrition.service.ts with:

  async createMeal(studentId: string, data: any) {
    try {
      return await prisma.meal.create({
        data: {
          studentId,
          type: data.type,
          date: data.date,
          items: {
            create: data.items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              calories: item.calories,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat
            }))
          }
        },
        include: { items: true }
      });
    } catch (e) {
      throw new AppError(409, 'ALREADY_EXISTS', 'Meal type already logged for this date');
    }
  },

  async getMeals(studentId: string, date: Date) {
    // We only want meals on that specific calendar day
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return prisma.meal.findMany({
      where: {
        studentId,
        date: { gte: startOfDay, lte: endOfDay }
      },
      include: { items: true }
    });
  },

  async deleteMeal(studentId: string, mealId: string) {
    const meal = await prisma.meal.findUnique({ where: { id: mealId } });
    if (!meal) throw new AppError(404, 'NOT_FOUND', 'Meal not found');
    if (meal.studentId !== studentId) throw new AppError(403, 'FORBIDDEN', 'Not your meal');

    return prisma.meal.delete({ where: { id: mealId } });
  }
```

- [ ] **Step 4: Run test to verify it passes**
```bash
npx vitest run tests/plugins/nutrition/nutrition.service.test.ts
```

- [ ] **Step 5: Commit**
```bash
git add src/plugins/nutrition/nutrition.service.ts tests/plugins/nutrition/nutrition.service.test.ts
git commit -m "feat: complete nutrition service crud"
```

---

### Task 3: Nutrition Routes & Plugin

**Files:**
- Create: `tests/plugins/nutrition/nutrition.routes.test.ts`
- Create: `src/plugins/nutrition/nutrition.schema.ts`
- Create: `src/plugins/nutrition/nutrition.routes.ts`
- Create: `src/plugins/nutrition/nutrition.plugin.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Write failing integration test**

```typescript
// tests/plugins/nutrition/nutrition.routes.test.ts
import { test, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { NutritionService } from '../../../src/plugins/nutrition/nutrition.service.js';

vi.mock('../../../src/middleware/authenticate.js', () => ({
  authenticate: async (req: any) => {
    req.user = { id: 'stu-1', role: 'ALUNO' };
  }
}));

test('POST /api/nutrition/meals creates meal', async () => {
  const app = await buildApp();
  
  vi.spyOn(NutritionService, 'createMeal').mockResolvedValue({ id: 'meal-1' } as any);

  const response = await supertest(app.server)
    .post('/api/nutrition/meals')
    .set('Authorization', 'Bearer token')
    .send({
      type: 'LUNCH',
      date: new Date().toISOString(),
      items: []
    });

  expect(response.status).toBe(200);
  expect(response.body.id).toBe('meal-1');
});
```

- [ ] **Step 2: Create Zod Schemas**

```typescript
// src/plugins/nutrition/nutrition.schema.ts
import z from 'zod';

const mealItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  calories: z.number().optional().nullable(),
  protein: z.number().optional().nullable(),
  carbs: z.number().optional().nullable(),
  fat: z.number().optional().nullable()
});

export const createMealSchema = z.object({
  type: z.enum(['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']),
  date: z.string().datetime(),
  items: z.array(mealItemSchema)
});
```

- [ ] **Step 3: Create Routes**

```typescript
// src/plugins/nutrition/nutrition.routes.ts
import { FastifyInstance } from 'fastify';
import { NutritionService } from './nutrition.service.js';
import { createMealSchema } from './nutrition.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { AppError } from '../../lib/errors.js';

export async function nutritionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', authenticate);

  fastify.post('/meals', async (request, reply) => {
    const user: any = (request as any).user;
    if (user.role !== 'ALUNO') throw new AppError(403, 'FORBIDDEN', 'Students only');

    const data = createMealSchema.parse(request.body);
    const result = await NutritionService.createMeal(user.id, { ...data, date: new Date(data.date) });
    return reply.send(result);
  });

  fastify.get('/meals', async (request, reply) => {
    const user: any = (request as any).user;
    const { date } = request.query as { date?: string };
    if (!date) throw new AppError(400, 'MISSING_DATE', 'Query param date is required');

    const result = await NutritionService.getMeals(user.id, new Date(date));
    return reply.send(result);
  });

  fastify.delete('/meals/:id', async (request, reply) => {
    const user: any = (request as any).user;
    const { id } = request.params as { id: string };
    
    await NutritionService.deleteMeal(user.id, id);
    return reply.send({ success: true });
  });

  fastify.get('/search', async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q) throw new AppError(400, 'MISSING_QUERY', 'Query param q is required');

    const result = await NutritionService.searchFood(q);
    return reply.send(result);
  });
}
```

- [ ] **Step 4: Create Plugin and Register**

```typescript
// src/plugins/nutrition/nutrition.plugin.ts
import { FastifyInstance } from 'fastify';
import { nutritionRoutes } from './nutrition.routes.js';

export default async function nutritionPlugin(fastify: FastifyInstance) {
  fastify.register(nutritionRoutes, { prefix: '/api/nutrition' });
}
```

```typescript
// Modify src/app.ts
import nutritionPlugin from './plugins/nutrition/nutrition.plugin.js';
// ...
app.register(nutritionPlugin);
```

- [ ] **Step 5: Run tests**
```bash
npx vitest run tests/plugins/nutrition/nutrition.routes.test.ts
```

- [ ] **Step 6: Commit**
```bash
git add src/plugins/nutrition src/app.ts tests/plugins/nutrition
git commit -m "feat: add nutrition plugin and routes"
```
