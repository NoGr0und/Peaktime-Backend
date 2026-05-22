import type { FastifyInstance } from 'fastify';
import { nutritionRoutes } from './nutrition.routes.js';

export default async function nutritionPlugin(fastify: FastifyInstance) {
  fastify.register(nutritionRoutes, { prefix: '/api/nutrition' });
}
