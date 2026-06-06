import { test, expect, vi, beforeEach } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { WorkoutsService } from '../../../src/plugins/workouts/workouts.service.js';

const validStudentId = '547bbd37-56ff-4537-83eb-21c6ffc59df0';
const otherStudentId = '947bbd37-56ff-4537-83eb-21c6ffc59df0';
let mockUser: any = { id: 'prof-1', role: 'PROFESSOR' };

vi.mock('../../../src/middleware/authenticate.js', () => ({
  authenticate: async (req: any) => {
    req.user = mockUser;
  }
}));

beforeEach(() => {
  mockUser = { id: 'prof-1', role: 'PROFESSOR' };
});

test('POST /api/workouts/plans creates plan by professor', async () => {
  const app = await buildApp();
  
  vi.spyOn(WorkoutsService, 'createPlan').mockResolvedValue({ id: 'plan-1' } as any);

  const response = await supertest(app.server)
    .post('/api/workouts/plans')
    .set('Authorization', 'Bearer token')
    .send({
      studentId: validStudentId,
      name: 'Plan 1',
      days: []
    });

  expect(response.status).toBe(200);
  expect(response.body.id).toBe('plan-1');
});

test('POST /api/workouts/plans allows student to create plan for themselves', async () => {
  const app = await buildApp();
  mockUser = { id: validStudentId, role: 'ALUNO' };
  
  vi.spyOn(WorkoutsService, 'createPlan').mockResolvedValue({ id: 'plan-2' } as any);

  const response = await supertest(app.server)
    .post('/api/workouts/plans')
    .set('Authorization', 'Bearer token')
    .send({
      studentId: validStudentId,
      name: 'My Plan',
      days: []
    });

  expect(response.status).toBe(200);
  expect(response.body.id).toBe('plan-2');
});

test('POST /api/workouts/plans forbids student from creating plan for another student', async () => {
  const app = await buildApp();
  mockUser = { id: validStudentId, role: 'ALUNO' };

  const response = await supertest(app.server)
    .post('/api/workouts/plans')
    .set('Authorization', 'Bearer token')
    .send({
      studentId: otherStudentId,
      name: 'Other Plan',
      days: []
    });

  expect(response.status).toBe(403);
});

test('GET /api/workouts/today returns today workout', async () => {
  const app = await buildApp();
  mockUser = { id: 'stu-1', role: 'ALUNO' };

  vi.spyOn(WorkoutsService, 'getTodayWorkout').mockResolvedValue({ id: 'day-1', name: 'Legs' } as any);

  const response = await supertest(app.server)
    .get('/api/workouts/today')
    .set('Authorization', 'Bearer token');

  expect(response.status).toBe(200);
  expect(response.body.id).toBe('day-1');
});

test('GET /api/workouts/weekly returns weekly dashboard', async () => {
  const app = await buildApp();
  mockUser = { id: 'stu-1', role: 'ALUNO' };

  vi.spyOn(WorkoutsService, 'getWeeklyDashboard').mockResolvedValue({ plans: [], completions: [] } as any);

  const response = await supertest(app.server)
    .get('/api/workouts/weekly')
    .set('Authorization', 'Bearer token');

  expect(response.status).toBe(200);
  expect(response.body.plans).toBeDefined();
});

test('GET /api/workouts/history returns student workout history', async () => {
  const app = await buildApp();
  mockUser = { id: 'stu-1', role: 'ALUNO' };

  vi.spyOn(WorkoutsService, 'getHistory').mockResolvedValue([{ id: 'comp-1' }] as any);

  const response = await supertest(app.server)
    .get('/api/workouts/history')
    .set('Authorization', 'Bearer token');

  expect(response.status).toBe(200);
  expect(response.body).toHaveLength(1);
});

test('POST /api/workouts/complete registers workout completion', async () => {
  const app = await buildApp();
  mockUser = { id: 'stu-1', role: 'ALUNO' };

  vi.spyOn(WorkoutsService, 'completeWorkout').mockResolvedValue({ id: 'comp-1' } as any);

  const response = await supertest(app.server)
    .post('/api/workouts/complete')
    .set('Authorization', 'Bearer token')
    .send({
      dayPlanId: '547bbd37-56ff-4537-83eb-21c6ffc59df0',
      date: new Date().toISOString()
    });

  expect(response.status).toBe(200);
  expect(response.body.id).toBe('comp-1');
});

