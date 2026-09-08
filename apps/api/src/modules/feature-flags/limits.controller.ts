import { Controller, Get } from '@nestjs/common';
import type { LimitsDto } from '@lophoc/shared';
import { LimitsService } from './limits.service.js';

@Controller('limits')
export class LimitsController {
  constructor(private readonly limits: LimitsService) {}

  @Get()
  getLimits(): Promise<LimitsDto> {
    return this.limits.getLimits();
  }
}
