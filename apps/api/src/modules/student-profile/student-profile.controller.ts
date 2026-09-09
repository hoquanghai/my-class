import { Controller, Get, Param } from '@nestjs/common';
import type { StudentProfileDto } from '@lophoc/shared';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { StudentProfileService } from './student-profile.service.js';

@Controller('classes/:classId/students/:studentId')
export class StudentProfileController {
  constructor(private readonly profiles: StudentProfileService) {}

  /** Hồ sơ học sinh: thông tin, thống kê điểm danh, lịch sử và điểm các bài kiểm tra. */
  @Get('profile')
  profile(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ): Promise<StudentProfileDto> {
    return this.profiles.profile(teacher.id, classId, studentId);
  }
}
