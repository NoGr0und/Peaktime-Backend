import { app } from '../../src/app.js';
import { vi } from 'vitest';

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {}
}));

export const buildApp = async () => {
  await app.ready();
  return app;
};
