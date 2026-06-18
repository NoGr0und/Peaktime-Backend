import { test, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { OccupancyService } from '../../../src/plugins/occupancy/occupancy.service.js';

let mockUser: any = { id: 'prof-1', role: 'PROFESSOR' };

vi.mock('../../../src/middleware/authenticate.js', () => ({
  authenticate: async (req: any) => {
    req.user = mockUser;
  }
}));

beforeEach(() => {
  mockUser = { id: 'prof-1', role: 'PROFESSOR' };
  vi.restoreAllMocks();
});

test('POST /api/occupancy/hardware increments count', async () => {
  const app = await buildApp();
  
  vi.spyOn(OccupancyService.prototype, 'updateFromHardware').mockResolvedValue({
    id: 'reading-1',
    count: 5,
    capacity: 100,
    timestamp: new Date(),
    percentage: 5,
    level: 'EMPTY'
  });

  const response = await supertest(app.server)
    .post('/api/occupancy/hardware')
    .set('Authorization', 'Bearer token')
    .send({
      change: 1
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.newOccupancy).toBe(5);
});

test('GET /api/occupancy/current returns current occupancy', async () => {
  const app = await buildApp();
  
  vi.spyOn(OccupancyService.prototype, 'getCurrentOccupancy').mockResolvedValue({
    id: 'reading-1',
    count: 15,
    capacity: 100,
    timestamp: new Date().toISOString(),
    percentage: 15,
    level: 'EMPTY'
  } as any);

  const response = await supertest(app.server)
    .get('/api/occupancy/current')
    .set('Authorization', 'Bearer token');

  expect(response.status).toBe(200);
  expect(response.body.count).toBe(15);
  expect(response.body.level).toBe('EMPTY');
});
