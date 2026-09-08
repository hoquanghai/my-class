import { Body, Controller, Patch } from '@nestjs/common';
import { type TeacherDto, type UpdateProfileInput, updateProfileSchema } from '@lophoc/shared';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { TeachersService } from './teachers.service.js';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Patch('me')
  async updateMe(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileInput,
  ): Promise<{ teacher: TeacherDto }> {
    return { teacher: await this.teachers.updateProfile(teacher.id, body) };
  }
}
