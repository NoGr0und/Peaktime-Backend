import type { FastifyInstance } from 'fastify';
import { workoutsRoutes } from './workouts.routes.js';

export default async function workoutsPlugin(fastify: FastifyInstance) {
  fastify.register(workoutsRoutes, { prefix: '/api/workouts' });
}
