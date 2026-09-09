import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  type ChangePasswordInput,
  changePasswordSchema,
  type TeacherDto,
  type UpdateProfileInput,
  updateProfileSchema,
} from '@lophoc/shared';
import type { Request } from 'express';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { readCookie, REFRESH_COOKIE } from '../auth/cookies.js';
import { sha256 } from '../auth/tokens.js';
import { TeachersService } from './teachers.service.js';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface UploadedImage {
  buffer: Buffer;
  size: number;
}

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get('me')
  async me(@CurrentTeacher() teacher: TeacherPrincipal): Promise<{ teacher: TeacherDto }> {
    return { teacher: await this.teachers.me(teacher.id) };
  }

  @Patch('me')
  async updateMe(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Body({ schema: updateProfileSchema }) body: UpdateProfileInput,
  ): Promise<{ teacher: TeacherDto }> {
    return { teacher: await this.teachers.updateProfile(teacher.id, body) };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('me/password')
  @HttpCode(200)
  async changePassword(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Body({ schema: changePasswordSchema }) body: ChangePasswordInput,
    @Req() req: Request,
  ): Promise<{ changed: true }> {
    const refresh = readCookie(req, REFRESH_COOKIE);
    await this.teachers.changePassword(teacher.id, body, refresh ? sha256(refresh) : undefined);
    return { changed: true };
  }

  @Post('me/avatar')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_AVATAR_BYTES } }))
  async uploadAvatar(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @UploadedFile() file?: UploadedImage,
  ): Promise<{ teacher: TeacherDto }> {
    if (!file) throw new BadRequestException('Chưa chọn ảnh');
    return { teacher: await this.teachers.setAvatar(teacher.id, file.buffer) };
  }

  @Delete('me/avatar')
  @HttpCode(200)
  async removeAvatar(
    @CurrentTeacher() teacher: TeacherPrincipal,
  ): Promise<{ teacher: TeacherDto }> {
    return { teacher: await this.teachers.removeAvatar(teacher.id) };
  }
}
