import type { FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';
import { supabase } from '../lib/supabase.js';
import { prisma } from '../lib/prisma.js';

export const authenticate = async (request: FastifyRequest) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    throw new AppError(401, 'UNAUTHORIZED', 'No authorization header');
  }

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid token');
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: data.user.id }
  });

  if (!dbUser) {
    throw new AppError(401, 'UNAUTHORIZED', 'User not synced in local database');
  }

  (request as any).user = dbUser;
};
