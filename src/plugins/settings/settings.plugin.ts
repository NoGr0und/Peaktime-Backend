import type { FastifyInstance } from 'fastify';
import { settingsRoutes } from './settings.routes.js';

export default async function settingsPlugin(fastify: FastifyInstance) {
  fastify.register(settingsRoutes, { prefix: '/api/settings' });
}
