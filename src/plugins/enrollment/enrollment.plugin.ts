import type { FastifyInstance } from 'fastify';
import { enrollmentRoutes } from './enrollment.routes.js';

export default async function enrollmentPlugin(fastify: FastifyInstance) {
  fastify.register(enrollmentRoutes, { prefix: '/api/enrollment' });
}
