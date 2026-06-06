import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { occupancyRoutes } from './occupancy.routes';

async function occupancyPlugin(fastify: FastifyInstance) {
  fastify.register(occupancyRoutes, { prefix: '/api/occupancy' });
}

export default fp(occupancyPlugin, {
  name: 'occupancy',
});
