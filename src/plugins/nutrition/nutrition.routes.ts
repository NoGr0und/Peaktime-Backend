import type { FastifyInstance } from 'fastify';
import { NutritionService } from './nutrition.service.js';
import { createMealSchema } from './nutrition.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { AppError } from '../../lib/errors.js';

export async function nutritionRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', authenticate);

  fastify.post('/meals', {
    schema: {
      tags: ['Nutrition'],
      summary: 'Registrar refeição',
      description: 'Aluno registra uma refeição com itens alimentares e macros.',
      security: [{ BearerAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'date', 'items'],
        properties: {
          type: { type: 'string', enum: ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'] },
          date: { type: 'string', format: 'date-time' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'quantity', 'unit'],
              properties: {
                name: { type: 'string', example: 'Arroz branco' },
                quantity: { type: 'number', minimum: 0.1 },
                unit: { type: 'string', example: 'g' },
                calories: { type: 'number', nullable: true },
                protein: { type: 'number', nullable: true },
                carbs: { type: 'number', nullable: true },
                fat: { type: 'number', nullable: true },
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
            studentId: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            items: { type: 'array', items: { type: 'object' } },
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
    if (user.role !== 'ALUNO') throw new AppError(403, 'FORBIDDEN', 'Students only');

    const data = createMealSchema.parse(request.body);
    const result = await NutritionService.createMeal(user.id, { ...data, date: new Date(data.date) });
    return reply.send(result);
  });

  fastify.get('/meals', {
    schema: {
      tags: ['Nutrition'],
      summary: 'Listar refeições do dia',
      description: 'Retorna todas as refeições registradas pelo aluno em uma data específica.',
      security: [{ BearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['date'],
        properties: {
          date: { type: 'string', format: 'date', description: 'Data no formato YYYY-MM-DD', example: '2026-05-13' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              type: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              items: { type: 'array', items: { type: 'object' } },
            },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    const { date } = request.query as { date?: string };
    if (!date) throw new AppError(400, 'MISSING_DATE', 'Query param date is required');

    const result = await NutritionService.getMeals(user.id, new Date(date));
    return reply.send(result);
  });

  fastify.delete('/meals/:id', {
    schema: {
      tags: ['Nutrition'],
      summary: 'Deletar refeição',
      description: 'Remove uma refeição registrada. Somente o dono pode deletar.',
      security: [{ BearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
        403: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const user: any = (request as any).user;
    const { id } = request.params as { id: string };
    
    await NutritionService.deleteMeal(user.id, id);
    return reply.send({ success: true });
  });

  fastify.get('/search', {
    schema: {
      tags: ['Nutrition'],
      summary: 'Buscar alimentos',
      description: 'Busca alimentos na API Open Food Facts. Retorna até 10 resultados com informações nutricionais por 100g.',
      security: [{ BearerAuth: [] }],
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string', description: 'Termo de busca', example: 'Arroz' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              caloriesPer100g: { type: 'number' },
              proteinPer100g: { type: 'number' },
              carbsPer100g: { type: 'number' },
              fatPer100g: { type: 'number' },
            },
          },
        },
        400: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q) throw new AppError(400, 'MISSING_QUERY', 'Query param q is required');

    const result = await NutritionService.searchFood(q);
    return reply.send(result);
  });
}
