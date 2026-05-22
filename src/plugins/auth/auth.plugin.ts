import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth.routes.js';

export default async function authPlugin(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: '/api/auth' });
}
