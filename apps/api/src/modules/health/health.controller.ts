import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok'; db: 'ok'; time: string }> {
    await this.prisma.$queryRaw`SELECT 1 AS ok`;
    return { status: 'ok', db: 'ok', time: new Date().toISOString() };
  }
}
