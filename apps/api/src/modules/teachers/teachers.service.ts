import { Injectable, NotFoundException } from '@nestjs/common';
import type { TeacherDto, UpdateProfileInput } from '@lophoc/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toTeacherDto } from '../auth/auth.service.js';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(teacherId: string, input: UpdateProfileInput): Promise<TeacherDto> {
    const existing = await this.prisma.teacher.findFirst({
      where: { id: teacherId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Tài khoản không tồn tại');
    const teacher = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { name: input.name },
    });
    return toTeacherDto(teacher);
  }
}
