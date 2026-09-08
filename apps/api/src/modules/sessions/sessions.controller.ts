import { Body, Controller, Get, HttpCode, Param, Patch, Post, Res } from '@nestjs/common';
import {
  type SessionDetailDto,
  type SessionFeedbackInput,
  sessionFeedbackSchema,
  type SessionListDto,
  type StudentAttendanceHistoryDto,
  type UpdateAttendanceInput,
  updateAttendanceSchema,
} from '@lophoc/shared';
import type { Response } from 'express';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { SessionsService } from './sessions.service.js';

@Controller('classes/:classId/sessions')
export class ClassSessionsController {
  constructor(private readonly sessions: SessionsService) {}

  /** 201 khi tạo buổi mới, 200 khi trả buổi đang mở. */
  @Post()
  async start(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionDetailDto> {
    const { detail, created } = await this.sessions.start(teacher.id, classId);
    res.status(created ? 201 : 200);
    return detail;
  }

  @Get()
  list(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
  ): Promise<SessionListDto> {
    return this.sessions.list(teacher.id, classId);
  }
}

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get(':id')
  detail(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
  ): Promise<SessionDetailDto> {
    return this.sessions.detail(teacher.id, id);
  }

  @Patch(':id/attendance')
  updateAttendance(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: updateAttendanceSchema }) body: UpdateAttendanceInput,
  ): Promise<SessionDetailDto> {
    return this.sessions.updateAttendance(teacher.id, id, body.updates);
  }

  @Post(':id/end')
  @HttpCode(200)
  end(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
  ): Promise<SessionDetailDto> {
    return this.sessions.end(teacher.id, id);
  }

  @Post(':id/feedback')
  @HttpCode(204)
  feedback(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: sessionFeedbackSchema }) body: SessionFeedbackInput,
  ): Promise<void> {
    return this.sessions.feedback(teacher.id, id, body);
  }
}

@Controller('classes/:classId/students/:studentId/attendance')
export class StudentAttendanceController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  history(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ): Promise<StudentAttendanceHistoryDto> {
    return this.sessions.studentHistory(teacher.id, classId, studentId);
  }
}
