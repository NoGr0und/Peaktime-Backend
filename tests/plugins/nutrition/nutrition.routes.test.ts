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
