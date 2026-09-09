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

  it('cho thêm học sinh khi 28 + 2 = 30 (giới hạn theo giáo viên)', async () => {
    await expect(makeService(0, 28).assertRosterCapacity('t1', 'c1', 2)).resolves.toBeUndefined();
  });

  it('chặn khi 28 + 3 > 30 với mã LIMIT_STUDENTS kèm details', async () => {
    await expect(makeService(0, 28).assertRosterCapacity('t1', 'c1', 3)).rejects.toMatchObject({
      response: {
        code: 'LIMIT_STUDENTS',
        details: { scope: 'teacher', limit: 30, current: 28, requested: 3, remaining: 2 },
      },
    });
  });

  it('rosterCapacity: chỗ trống là min của giới hạn theo lớp và theo giáo viên', async () => {
    await expect(makeService(0, 10).rosterCapacity('t1', 'c1')).resolves.toMatchObject({
      perClass: 50,
      perTeacher: 30,
      remaining: 20,
    });
  });

  it('getLimitsFor kèm usage', async () => {
    await expect(makeService(2, 12).getLimitsFor('t1')).resolves.toMatchObject({
      maxStudentsPerTeacher: 30,
      usage: { classes: 2, students: 12 },
    });
  });

  it('getLimits trả mặc định khi không có flag', async () => {
    await expect(makeService(0, 0).getLimits()).resolves.toEqual({
      maxClasses: 2,
      maxStudentsPerClass: 50,
      maxStudentsPerTeacher: 30,
      aiPagesPerMonth: 20,
      historyDays: 30,
      exportEnabled: false,
    });
  });
});
