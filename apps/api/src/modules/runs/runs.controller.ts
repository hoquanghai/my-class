import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import {
  type LaunchRunInput,
  launchRunSchema,
  type OverrideAnswerInput,
  overrideAnswerSchema,
  type RunDetailDto,
  type RunListItemDto,
  type RunPublicStateDto,
  type StudentRunViewDto,
  type SubmitAnswerInput,
  submitAnswerSchema,
  type SubmitAnswerResultDto,
} from '@lophoc/shared';
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
import { RunsService } from './runs.service.js';

@Controller('sessions/:sessionId/runs')
export class SessionRunsController {
  constructor(private readonly runs: RunsService) {}

  @Post()
  @HttpCode(201)
  launch(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('sessionId') sessionId: string,
    @Body({ schema: launchRunSchema }) body: LaunchRunInput,
  ): Promise<RunDetailDto> {
    return this.runs.launch(t.id, sessionId, body);
  }

  @Get()
  list(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('sessionId') sessionId: string,
  ): Promise<RunListItemDto[]> {
    return this.runs.list(t.id, sessionId);
  }
}

@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Get(':id')
  detail(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<RunDetailDto> {
    return this.runs.detail(t.id, id);
  }

  @Public()
  @Get(':id/public')
  publicState(@Param('id') id: string): Promise<RunPublicStateDto> {
    return this.runs.publicState(id);
  }

  @Post(':id/start')
  @HttpCode(200)
  start(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<RunDetailDto> {
    return this.runs.start(t.id, id);
  }

  @Post(':id/next')
  @HttpCode(200)
  next(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<RunDetailDto> {
    return this.runs.next(t.id, id);
  }

  @Post(':id/close')
  @HttpCode(200)
  close(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<RunDetailDto> {
    return this.runs.close(t.id, id);
  }

  @Post(':id/finish')
  @HttpCode(200)
  finish(@CurrentTeacher() t: TeacherPrincipal, @Param('id') id: string): Promise<RunDetailDto> {
    return this.runs.finish(t.id, id);
  }

  @Patch(':id/answers/:answerId')
  override(
    @CurrentTeacher() t: TeacherPrincipal,
    @Param('id') id: string,
    @Param('answerId') answerId: string,
    @Body({ schema: overrideAnswerSchema }) body: OverrideAnswerInput,
  ): Promise<RunDetailDto> {
    return this.runs.override(t.id, id, answerId, body.isCorrect);
  }
}

@Controller('student/runs')
export class StudentRunsController {
  constructor(private readonly runs: RunsService) {}

  @StudentRoute()
  @Get(':id')
  view(@CurrentStudent() s: StudentPrincipal, @Param('id') id: string): Promise<StudentRunViewDto> {
    return this.runs.studentView(s, id);
  }

  @StudentRoute()
  @Post(':id/answers')
  @HttpCode(200)
  submit(
    @CurrentStudent() s: StudentPrincipal,
    @Param('id') id: string,
    @Body({ schema: submitAnswerSchema }) body: SubmitAnswerInput,
  ): Promise<SubmitAnswerResultDto> {
    return this.runs.submit(s, id, body);
  }
}
