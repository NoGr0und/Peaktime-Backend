import { test, expect, vi, beforeEach } from 'vitest';
import { WorkoutsService } from '../../../src/plugins/workouts/workouts.service.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    weeklyPlan: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    dayPlan: { findFirst: vi.fn() },
    workoutCompletion: { create: vi.fn(), findMany: vi.fn() }
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

test('getActivePlans returns list of plans', async () => {
  vi.mocked(prisma.weeklyPlan.findMany).mockResolvedValue([{ id: 'plan-1', active: true }] as any);

  const result = await WorkoutsService.getActivePlans('stu-1');
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('plan-1');
  expect(prisma.weeklyPlan.findMany).toHaveBeenCalledWith({
    where: { studentId: 'stu-1', active: true },
    include: { days: { include: { exercises: true } } },
    orderBy: { createdAt: 'desc' }
  });
});

test('getTodayWorkout returns workout for specified day', async () => {
  const mockPlans = [
    {
      id: 'plan-1',
      days: [
        { dayOfWeek: 'MONDAY', name: 'Legs' },
        { dayOfWeek: 'WEDNESDAY', name: 'Chest' }
      ]
    }
  ];
  vi.mocked(prisma.weeklyPlan.findMany).mockResolvedValue(mockPlans as any);

  const result = await WorkoutsService.getTodayWorkout('stu-1', 'MONDAY');
  expect(result?.name).toBe('Legs');

  const noWorkoutResult = await WorkoutsService.getTodayWorkout('stu-1', 'TUESDAY');
  expect(noWorkoutResult).toBeNull();
});

test('getWeeklyDashboard returns plans and completions', async () => {
  vi.mocked(prisma.weeklyPlan.findMany).mockResolvedValue([{ id: 'plan-1' }] as any);
  vi.mocked(prisma.workoutCompletion.findMany).mockResolvedValue([{ id: 'comp-1' }] as any);

  const result = await WorkoutsService.getWeeklyDashboard('stu-1');
  expect(result.plans).toHaveLength(1);
  expect(result.completions).toHaveLength(1);
  expect(prisma.workoutCompletion.findMany).toHaveBeenCalled();
});

test('completeWorkout records completion', async () => {
  vi.mocked(prisma.workoutCompletion.create).mockResolvedValue({ id: 'comp-1' } as any);
  const result = await WorkoutsService.completeWorkout('stu-1', 'day-1', new Date('2026-05-13'));
  expect(result.id).toBe('comp-1');
});

test('getHistory returns sorted completions', async () => {
  vi.mocked(prisma.workoutCompletion.findMany).mockResolvedValue([{ id: 'comp-1', dayPlan: { name: 'Legs' } }] as any);

  const result = await WorkoutsService.getHistory('stu-1');
  expect(result).toHaveLength(1);
  expect(result[0].dayPlan.name).toBe('Legs');
  expect(prisma.workoutCompletion.findMany).toHaveBeenCalledWith({
    where: { studentId: 'stu-1' },
    include: {
      dayPlan: {
        include: {
          exercises: {
            orderBy: { order: 'asc' }
          }
        }
      }
    },
    orderBy: { date: 'desc' }
  });
});

