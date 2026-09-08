import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(): Promise<{ status: 'ok'; db: 'ok'; time: string }> {
    await this.prisma.$queryRaw`SELECT 1 AS ok`;
    return { status: 'ok', db: 'ok', time: new Date().toISOString() };
  }
}
