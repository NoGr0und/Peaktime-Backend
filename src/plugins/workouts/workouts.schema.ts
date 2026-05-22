import z from 'zod';

const exerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  loadKg: z.number().optional().nullable(),
  restSeconds: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  order: z.number().int().nonnegative()
});

const dayPlanSchema = z.object({
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  name: z.string(),
  exercises: z.array(exerciseSchema)
});

export const createPlanSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string(),
  days: z.array(dayPlanSchema)
});

export const completeWorkoutSchema = z.object({
  dayPlanId: z.string().uuid(),
  date: z.string().datetime()
});
