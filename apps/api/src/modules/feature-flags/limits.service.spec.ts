import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { FeatureFlagsService } from './feature-flags.service.js';
import { LimitsService } from './limits.service.js';

function makeService(classCount: number, studentCount: number) {
  const prisma = {
    class: { count: vi.fn().mockResolvedValue(classCount) },
    student: { count: vi.fn().mockResolvedValue(studentCount) },
  } as unknown as PrismaService;
  const flags = {
    get: vi.fn(async (_key: string, fallback: unknown) => fallback),
  } as unknown as FeatureFlagsService;
  return new LimitsService(prisma, flags);
}

describe('LimitsService', () => {
  it('cho tạo lớp khi chưa đạt 2 lớp', async () => {
    await expect(makeService(1, 0).assertCanCreateClass('t1')).resolves.toBeUndefined();
  });

  it('chặn lớp thứ 3 với mã LIMIT_CLASSES', async () => {
    await expect(makeService(2, 0).assertCanCreateClass('t1')).rejects.toMatchObject({
      response: { code: 'LIMIT_CLASSES' },
    });
    await expect(makeService(2, 0).assertCanCreateClass('t1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('cho thêm học sinh khi 48 + 2 = 50', async () => {
    await expect(makeService(0, 48).assertRosterCapacity('c1', 2)).resolves.toBeUndefined();
  });

  it('chặn khi 48 + 3 > 50 với mã LIMIT_STUDENTS', async () => {
    await expect(makeService(0, 48).assertRosterCapacity('c1', 3)).rejects.toMatchObject({
      response: { code: 'LIMIT_STUDENTS' },
    });
  });

  it('getLimits trả mặc định khi không có flag', async () => {
    await expect(makeService(0, 0).getLimits()).resolves.toEqual({
      maxClasses: 2,
      maxStudentsPerClass: 50,
      aiPagesPerMonth: 20,
      historyDays: 30,
      exportEnabled: false,
    });
  });
});
