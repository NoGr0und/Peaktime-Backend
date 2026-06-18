import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { OccupancyService } from './occupancy.service.js';
import { occupancyReadingSchema } from './occupancy.schema.js';

export const occupancyRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const service = new OccupancyService();

  // Exige autenticação em todas as rotas (usa o hook onRoute do auth plugin, se configurado)
  // Assumimos que o plugin de auth é global ou será aplicado.

  fastify.get('/current', async (_request, reply) => {
    const data = await service.getCurrentOccupancy();
    return reply.send(data);
  });

  fastify.get('/history', async (request, reply) => {
    const query = request.query as { date?: string };
    const data = await service.getDayHistory(query.date);
    return reply.send(data);
  });

  fastify.get('/forecast', async (_request, reply) => {
    const data = await service.getForecast();
    return reply.send(data);
  });

  // Apenas professores poderiam teoricamente adicionar leituras (ou um sensor automático IoT via API)
  fastify.post('/readings', {
    schema: {
      body: occupancyReadingSchema,
    },
  }, async (request, reply) => {
    const body = request.body as { count: number; capacity: number };
    const data = await service.createReading(body.count, body.capacity);
    return reply.status(201).send(data);
  });

  fastify.post('/hardware', {
    schema: {
      body: {
        type: 'object',
        required: ['change'],
        properties: {
          change: { type: 'number', description: '1 para somar (entrada), -1 para subtrair (saída)' }
        }
      }
    }
  }, async (request, reply) => {
    const { change } = request.body as { change: number };
    const data = await service.updateFromHardware(change);
    return reply.status(200).send({
      success: true,
      newOccupancy: data.count
    });
  });
};
