import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

export const WorkoutsService = {
  async createPlan(professorId: string, studentId: string, data: any) {
    return prisma.weeklyPlan.create({
      data: {
        name: data.name,
        professorId,
        studentId,
        days: {
          create: data.days.map((day: any) => ({
            dayOfWeek: day.dayOfWeek,
            name: day.name,
            exercises: {
              create: day.exercises.map((ex: any) => ({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                loadKg: ex.loadKg,
                restSeconds: ex.restSeconds,
                notes: ex.notes,
                order: ex.order
              }))
            }
          }))
        }
      },
      include: { days: { include: { exercises: true } } }
    });
  },

  async getActivePlan(studentId: string) {
    return prisma.weeklyPlan.findFirst({
      where: { studentId, active: true },
      include: { days: { include: { exercises: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getTodayWorkout(studentId: string, dayOfWeek: string) {
    const activePlan = await this.getActivePlan(studentId);
    if (!activePlan) return null;

    return activePlan.days.find(d => d.dayOfWeek === dayOfWeek) || null;
  },

  async completeWorkout(studentId: string, dayPlanId: string, date: Date) {
    try {
      return await prisma.workoutCompletion.create({
        data: {
          studentId,
          dayPlanId,
          date
        }
      });
    } catch (e) {
      throw new AppError(409, 'ALREADY_COMPLETED', 'Workout already completed today');
    }
  }
};
