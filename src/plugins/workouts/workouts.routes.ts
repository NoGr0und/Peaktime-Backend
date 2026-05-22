import type { FastifyInstance } from 'fastify';
import { WorkoutsService } from './workouts.service.js';
import { createPlanSchema, completeWorkoutSchema } from './workouts.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { AppError } from '../../lib/errors.js';

export async function workoutsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', authenticate);

  fastify.post('/plans', {
    schema: {
      tags: ['Workouts'],
      summary: 'Criar plano semanal de treino',
      description: 'Professor cria um plano semanal completo com dias e exercícios para um aluno.',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['studentId', 'name', 'days'],
        properties: {
          studentId: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Hipertrofia - Semana 1' },
          days: {
            type: 'array',
            items: {
              type: 'object',
              required: ['dayOfWeek', 'name', 'exercises'],
              properties: {
                dayOfWeek: { type: 'string', enum: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] },
                name: { type: 'string', example: 'Peito e Tríceps' },
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['name', 'sets', 'reps', 'order'],
                    properties: {
                      name: { type: 'string', example: 'Supino Reto' },
                      sets: { type: 'integer', minimum: 1 },
                      reps: { type: 'integer', minimum: 1 },
                      loadKg: { type: 'number', nullable: true },
                      restSeconds: { type: 'integer', nullable: true },
                      notes: { type: 'string', nullable: true },
                      order: { type: 'integer', minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            professorId: { type: 'string', format: 'uuid' },
            studentId: { type: 'string', format: 'uuid' },
            active: { type: 'boolean' },
            days: { type: 'array', items: { type: 'object' } },
          },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    if (user.role !== 'PROFESSOR') throw new AppError(403, 'FORBIDDEN', 'Professors only');

    const data = createPlanSchema.parse(request.body);
    const result = await WorkoutsService.createPlan(user.id, data.studentId, data);
    return reply.send(result);
  });

  fastify.get('/today', {
    schema: {
      tags: ['Workouts'],
      summary: 'Treino de hoje',
      description: 'Retorna o plano de treino do dia atual baseado no dia da semana.',
      security: [{ BearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            dayOfWeek: { type: 'string' },
            name: { type: 'string' },
            exercises: { type: 'array', items: { type: 'object' } },
            message: { type: 'string', description: 'Retornado quando não há treino hoje' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayStr = days[new Date().getDay()]!;

    const result = await WorkoutsService.getTodayWorkout(user.id, todayStr);
    return reply.send(result || { message: 'No workout today' });
  });

  fastify.post('/complete', {
    schema: {
      tags: ['Workouts'],
      summary: 'Marcar treino como completo',
      description: 'Aluno marca um DayPlan como concluído em uma data específica.',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['dayPlanId', 'date'],
        properties: {
          dayPlanId: { type: 'string', format: 'uuid' },
          date: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            studentId: { type: 'string', format: 'uuid' },
            dayPlanId: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date-time' },
          },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        409: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    if (user.role !== 'ALUNO') throw new AppError(403, 'FORBIDDEN', 'Students only');

    const data = completeWorkoutSchema.parse(request.body);
    const result = await WorkoutsService.completeWorkout(user.id, data.dayPlanId, new Date(data.date));
    return reply.send(result);
  });
}
