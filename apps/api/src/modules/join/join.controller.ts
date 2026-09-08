import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  type JoinInfoDto,
  type PickNameInput,
  pickNameSchema,
  type PickNameResultDto,
  type StudentMeDto,
} from '@lophoc/shared';
import type { Request, Response } from 'express';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  CurrentStudent,
  type StudentPrincipal,
  StudentRoute,
} from '../../common/decorators/student.decorator.js';
import type { Env } from '../../config/env.js';
import {
  STUDENT_COOKIE,
  STUDENT_TOKEN_TTL_SEC,
  StudentTokenService,
} from '../student-auth/student-token.service.js';
import { JoinService } from './join.service.js';

@Controller()
export class JoinController {
  private readonly secure: boolean;

  constructor(
    private readonly join: JoinService,
    private readonly tokens: StudentTokenService,
    config: ConfigService<Env, true>,
  ) {
    this.secure = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Public()
  @Get('join/:code')
  info(@Param('code') code: string): Promise<JoinInfoDto> {
    return this.join.info(code);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('join/:code/pick')
  @HttpCode(200)
  async pick(
    @Param('code') code: string,
    @Body({ schema: pickNameSchema }) body: PickNameInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PickNameResultDto> {
    const current = await this.tokens.verify(this.tokens.readToken(req));
    const result = await this.join.pick(code, body.studentId, current, req.headers['user-agent']);
    res.cookie(STUDENT_COOKIE, result.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.secure,
      path: '/',
      maxAge: STUDENT_TOKEN_TTL_SEC * 1000,
    });
    return result;
  }

  @StudentRoute()
  @Get('student/me')
  me(@CurrentStudent() student: StudentPrincipal): Promise<StudentMeDto> {
    return this.join.me(student);
  }

  @Post('classes/:classId/students/:studentId/unbind')
  @HttpCode(204)
  unbind(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ): Promise<void> {
    return this.join.unbind(teacher.id, classId, studentId);
  }
}
