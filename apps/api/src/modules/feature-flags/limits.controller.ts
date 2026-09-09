import { Controller, Get } from '@nestjs/common';
import type { LimitsDto } from '@lophoc/shared';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { LimitsService } from './limits.service.js';

@Controller('limits')
export class LimitsController {
  constructor(private readonly limits: LimitsService) {}

  @Get()
  getLimits(@CurrentTeacher() teacher: TeacherPrincipal): Promise<LimitsDto> {
    return this.limits.getLimitsFor(teacher.id);
  }
}
