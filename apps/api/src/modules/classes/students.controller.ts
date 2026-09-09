import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  type CreateStudentInput,
  createStudentSchema,
  type ImportNamesInput,
  importNamesSchema,
  type ReorderStudentsInput,
  reorderStudentsSchema,
  type RosterImportResultDto,
  type StudentDto,
  type UpdateStudentInput,
  updateStudentSchema,
} from '@lophoc/shared';
import type { Response } from 'express';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { StudentsService } from './students.service.js';

const MAX_XLSX_BYTES = 2 * 1024 * 1024;

/** Phần của multer file mà controller cần (tránh phụ thuộc kiểu toàn cục Express.Multer). */
interface UploadedXlsx {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

/** `?fit=1`: chỉ nhập số học sinh còn chỗ thay vì báo lỗi vượt giới hạn. */
function wantsFit(fit?: string): boolean {
  return fit === '1' || fit === 'true';
}

function looksLikeXlsx(file: UploadedXlsx): boolean {
  const zipMagic = file.buffer.length > 2 && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b;
  const byName = /\.xlsx$/i.test(file.originalname);
  const byMime = /spreadsheetml|officedocument/i.test(file.mimetype);
  return zipMagic && (byName || byMime);
}

@Controller('classes/:classId/students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  /** Thêm một học sinh với đầy đủ thông tin (hộp thoại trên web). */
  @Post()
  @HttpCode(201)
  create(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Body({ schema: createStudentSchema }) body: CreateStudentInput,
  ): Promise<RosterImportResultDto> {
    return this.students.create(teacher.id, classId, body);
  }

  @Post('import')
  @HttpCode(200)
  importNames(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Body({ schema: importNamesSchema }) body: ImportNamesInput,
    @Query('fit') fit?: string,
  ): Promise<RosterImportResultDto> {
    return this.students.importNames(teacher.id, classId, body.names, wantsFit(fit));
  }

  @Post('import-excel')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_XLSX_BYTES } }))
  importExcel(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Query('fit') fit?: string,
    @UploadedFile() file?: UploadedXlsx,
  ): Promise<RosterImportResultDto> {
    if (!file) throw new BadRequestException('Chưa chọn file Excel');
    if (!looksLikeXlsx(file)) throw new BadRequestException('Chỉ hỗ trợ file .xlsx');
    return this.students.importExcel(teacher.id, classId, file.buffer, wantsFit(fit));
  }

  /** File Excel mẫu: đủ cột, tiêu đề ghi rõ (bắt buộc)/(tùy chọn), kèm sheet Hướng dẫn. */
  @Get('template.xlsx')
  async template(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.students.template(teacher.id, classId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.end(buffer);
  }

  @Post('reorder')
  @HttpCode(200)
  reorder(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Body({ schema: reorderStudentsSchema }) body: ReorderStudentsInput,
  ): Promise<StudentDto[]> {
    return this.students.reorder(teacher.id, classId, body.ids);
  }

  @Patch(':studentId')
  update(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
    @Body({ schema: updateStudentSchema }) body: UpdateStudentInput,
  ): Promise<StudentDto> {
    return this.students.update(teacher.id, classId, studentId, body);
  }

  @Delete(':studentId')
  @HttpCode(204)
  remove(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ): Promise<void> {
    return this.students.remove(teacher.id, classId, studentId);
  }
}
