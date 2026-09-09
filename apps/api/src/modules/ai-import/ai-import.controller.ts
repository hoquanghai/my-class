import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { AiJobCreatedDto, AiJobDto, AiJobSummaryDto, AiQuotaDto } from '@lophoc/shared';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { AiImportService, type IncomingFile, MAX_AI_IMAGES } from './ai-import.service.js';

const MAX_FILE_BYTES = 20 * 1024 * 1024;

@Controller('questions/import/ai')
export class AiImportController {
  constructor(private readonly ai: AiImportService) {}

  @Get('quota')
  quota(@CurrentTeacher() teacher: TeacherPrincipal): Promise<AiQuotaDto> {
    return this.ai.quota(teacher.id);
  }

  /** Tạo job trích xuất: field `files` (1–10 ảnh hoặc 1 PDF), tùy chọn `subject`, `grade`. */
  @Post()
  @HttpCode(202)
  @UseInterceptors(
    FilesInterceptor('files', MAX_AI_IMAGES, { limits: { fileSize: MAX_FILE_BYTES } }),
  )
  create(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @UploadedFiles() files: IncomingFile[] | undefined,
    @Body() body: { subject?: string; grade?: string },
  ): Promise<AiJobCreatedDto> {
    return this.ai.createJob(teacher.id, files ?? [], {
      subject: body?.subject,
      grade: body?.grade,
    });
  }

  @Get('jobs')
  jobs(@CurrentTeacher() teacher: TeacherPrincipal): Promise<AiJobSummaryDto[]> {
    return this.ai.listJobs(teacher.id);
  }

  @Get('jobs/:id')
  job(@CurrentTeacher() teacher: TeacherPrincipal, @Param('id') id: string): Promise<AiJobDto> {
    return this.ai.getJob(teacher.id, id);
  }
}
