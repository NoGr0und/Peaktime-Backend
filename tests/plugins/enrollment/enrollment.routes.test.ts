import { test, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { EnrollmentService } from '../../../src/plugins/enrollment/enrollment.service.js';

vi.mock('../../../src/middleware/authenticate.js', () => ({
  authenticate: async (req: any) => {
    req.user = { id: 'prof-id', role: 'PROFESSOR' };
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
