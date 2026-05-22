import { test, expect, vi } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../../helpers/setup.js';
import { SettingsService } from '../../../src/plugins/settings/settings.service.js';

vi.mock('../../../src/middleware/authenticate.js', () => ({
  authenticate: async (req: any) => {
    req.user = { id: 'user-1' };
  }
}));

test('POST /api/settings/push-token registers token', async () => {
  const app = await buildApp();
  
  vi.spyOn(SettingsService, 'registerPushToken').mockResolvedValue({ id: 'token-1' } as any);

  const response = await supertest(app.server)
    .post('/api/settings/push-token')
    .set('Authorization', 'Bearer token')
    .send({ token: 'ExponentPushToken[123]' });

  expect(response.status).toBe(200);
});
