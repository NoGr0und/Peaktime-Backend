import { test, expect, vi, beforeEach } from 'vitest';
import { EnrollmentService } from '../../../src/plugins/enrollment/enrollment.service.js';
import { prisma } from '../../../src/lib/prisma.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    inviteCode: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    enrollment: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    }
  }
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test('generateInviteCode creates and returns a 6-char code', async () => {
  const mockCode = { id: 'uuid', code: 'ABC123', professorId: 'prof-id', expiresAt: new Date() };
  vi.mocked(prisma.inviteCode.create).mockResolvedValue(mockCode as any);

  const result = await EnrollmentService.generateInviteCode('prof-id');
  expect(result.code).toHaveLength(6);
  expect(prisma.inviteCode.create).toHaveBeenCalled();
});

test('joinWithCode throws if code not found', async () => {
  vi.mocked(prisma.inviteCode.findUnique).mockResolvedValue(null);
  await expect(EnrollmentService.joinWithCode('student-id', 'BADCOD')).rejects.toThrow('Invalid or expired code');
});

test('joinWithCode creates enrollment', async () => {
  const mockCode = { id: 'code-id', code: 'ABC123', professorId: 'prof-id', expiresAt: new Date(Date.now() + 10000) };
  vi.mocked(prisma.inviteCode.findUnique).mockResolvedValue(mockCode as any);
  vi.mocked(prisma.enrollment.create).mockResolvedValue({ id: 'enr-id' } as any);

  const result = await EnrollmentService.joinWithCode('student-id', 'ABC123');
  expect(result.id).toBe('enr-id');
});
