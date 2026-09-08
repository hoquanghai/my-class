import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('trả về status ok khi DB trả lời', async () => {
    const prismaMock = { $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]) };
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prismaMock }],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('ok');
    expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
