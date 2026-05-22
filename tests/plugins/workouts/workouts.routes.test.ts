import { test, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { WorkoutsService } from '../../../src/plugins/workouts/workouts.service.js';

vi.mock('../../../src/middleware/authenticate.js', () => ({
  authenticate: async (req: any) => {
    req.user = { id: 'prof-1', role: 'PROFESSOR' };
  }
}));

test('POST /api/workouts/plans creates plan', async () => {
  const app = await buildApp();
  
  vi.spyOn(WorkoutsService, 'createPlan').mockResolvedValue({ id: 'plan-1' } as any);

  const response = await supertest(app.server)
    .post('/api/workouts/plans')
    .set('Authorization', 'Bearer token')
    .send({
      studentId: '547bbd37-56ff-4537-83eb-21c6ffc59df0',
      name: 'Plan 1',
      days: []
    });

  expect(response.status).toBe(200);
  expect(response.body.id).toBe('plan-1');
});
