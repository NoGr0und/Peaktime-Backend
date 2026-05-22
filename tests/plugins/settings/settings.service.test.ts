import { test, expect, vi, beforeEach } from 'vitest';
import { SettingsService } from '../../../src/plugins/settings/settings.service.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    pushToken: { upsert: vi.fn(), findMany: vi.fn() },
  }
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();
});

test('registerPushToken upserts token in db', async () => {
  vi.mocked(prisma.pushToken.upsert).mockResolvedValue({ id: 'token-1' } as any);

  const result = await SettingsService.registerPushToken('user-1', 'ExponentPushToken[xxxx]');
  expect(result.id).toBe('token-1');
  expect(prisma.pushToken.upsert).toHaveBeenCalled();
});

test('sendNotification hits Expo API', async () => {
  vi.mocked(prisma.pushToken.findMany).mockResolvedValue([{ token: 'ExponentPushToken[xxxx]' }] as any);
  mockFetch.mockResolvedValue({ ok: true } as any);

  await SettingsService.sendNotification('user-1', 'Title', 'Body');
  
  expect(mockFetch).toHaveBeenCalledWith('https://exp.host/--/api/v2/push/send', expect.any(Object));
});
