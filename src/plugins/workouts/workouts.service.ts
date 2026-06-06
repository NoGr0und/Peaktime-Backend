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

  async getActivePlans(studentId: string) {
    return prisma.weeklyPlan.findMany({
      where: { studentId, active: true },
      include: { days: { include: { exercises: true } } },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getTodayWorkout(studentId: string, dayOfWeek: string) {
    const activePlans = await this.getActivePlans(studentId);
    if (activePlans.length === 0) return null;

    // Apenas retorna o do primeiro plano ativo para retrocompatibilidade
    return activePlans[0].days.find(d => d.dayOfWeek === dayOfWeek) || null;
  },

  async getWeeklyDashboard(studentId: string) {
    const plans = await this.getActivePlans(studentId);
    
    // Get current week's start and end dates
    const now = new Date();
    const day = now.getDay();
    // Assuming week starts on Monday (1) and ends on Sunday (0)
    // Adjust logic to get Monday 00:00:00 to Sunday 23:59:59
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    
    const startOfWeek = new Date(now.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const completions = await prisma.workoutCompletion.findMany({
      where: {
        studentId,
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      }
    });

    return {
      plans,
      completions
    };
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
  },

  async getHistory(studentId: string) {
    return prisma.workoutCompletion.findMany({
      where: { studentId },
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
  }
};
