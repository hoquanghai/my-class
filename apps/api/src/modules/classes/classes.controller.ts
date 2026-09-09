import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type ClassDetailDto,
  type ClassSummaryDto,
  type CreateClassInput,
  createClassSchema,
  type UpdateClassInput,
  updateClassSchema,
} from '@lophoc/shared';
import type { Response } from 'express';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import type { Env } from '../../config/env.js';
import { ClassesService } from './classes.service.js';
import { QrService } from './qr.service.js';

@Controller('classes')
export class ClassesController {
  private readonly studentUrl: string;

  constructor(
    private readonly classes: ClassesService,
    private readonly qr: QrService,
    config: ConfigService<Env, true>,
  ) {
    this.studentUrl = config.get('STUDENT_APP_URL', { infer: true });
  }

  @Get()
  list(@CurrentTeacher() teacher: TeacherPrincipal): Promise<ClassSummaryDto[]> {
    return this.classes.list(teacher.id);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Body({ schema: createClassSchema }) body: CreateClassInput,
  ): Promise<ClassDetailDto> {
    return this.classes.create(teacher.id, body);
  }

  @Get(':id')
  detail(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
  ): Promise<ClassDetailDto> {
    return this.classes.getDetail(teacher.id, id);
  }

  @Patch(':id')
  update(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: updateClassSchema }) body: UpdateClassInput,
  ): Promise<ClassDetailDto> {
    return this.classes.update(teacher.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  softDelete(@CurrentTeacher() teacher: TeacherPrincipal, @Param('id') id: string): Promise<void> {
    return this.classes.softDelete(teacher.id, id);
  }

  @Delete(':id/permanent')
  @HttpCode(204)
  hardDelete(@CurrentTeacher() teacher: TeacherPrincipal, @Param('id') id: string): Promise<void> {
    return this.classes.hardDelete(teacher.id, id);
  }

  @Post(':id/regenerate-code')
  @HttpCode(200)
  async regenerateCode(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
  ): Promise<{ code: string }> {
    return { code: await this.classes.regenerateCode(teacher.id, id) };
  }

  @Get(':id/qr.png')
  async qrPng(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const klass = await this.classes.findOwned(teacher.id, id);
    const png = await this.qr.png(`${this.studentUrl}/${klass.code}`);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Content-Disposition', `inline; filename="lophoc-${klass.code}.png"`);
    res.end(png);
  }
}
