import { test, expect, vi, beforeEach } from 'vitest';
import { WorkoutsService } from '../../../src/plugins/workouts/workouts.service.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    weeklyPlan: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    dayPlan: { findFirst: vi.fn() },
    workoutCompletion: { create: vi.fn() }
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('createPlan creates a weekly plan', async () => {
  vi.mocked(prisma.weeklyPlan.create).mockResolvedValue({ id: 'plan-1' } as any);

  const result = await WorkoutsService.createPlan('prof-1', 'stu-1', {
    name: 'Plan 1',
    days: [{ dayOfWeek: 'MONDAY', name: 'Legs', exercises: [] }]
  });

  expect(result.id).toBe('plan-1');
  expect(prisma.weeklyPlan.create).toHaveBeenCalled();
});

test('completeWorkout records completion', async () => {
  vi.mocked(prisma.workoutCompletion.create).mockResolvedValue({ id: 'comp-1' } as any);
  const result = await WorkoutsService.completeWorkout('stu-1', 'day-1', new Date('2026-05-13'));
  expect(result.id).toBe('comp-1');
});
