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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  type BulkCreateQuestionsInput,
  bulkCreateQuestionsSchema,
  type BulkCreateResultDto,
  type ParseResult,
  type QuestionDto,
  type QuestionFacetsDto,
  type QuestionFilter,
  questionFilterSchema,
  type QuestionInput,
  questionInputSchema,
  type QuestionListDto,
  type UpdateQuestionInput,
  updateQuestionSchema,
} from '@lophoc/shared';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { DocxImportService } from './docx-import.service.js';
import { QuestionsService } from './questions.service.js';

const MAX_DOCX_BYTES = 10 * 1024 * 1024;

interface UploadedDocx {
  buffer: Buffer;
  originalname: string;
}

@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questions: QuestionsService,
    private readonly docx: DocxImportService,
  ) {}

  @Get()
  list(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Query({ schema: questionFilterSchema }) filter: QuestionFilter,
  ): Promise<QuestionListDto> {
    return this.questions.list(teacher.id, filter);
  }

  @Get('facets')
  facets(@CurrentTeacher() teacher: TeacherPrincipal): Promise<QuestionFacetsDto> {
    return this.questions.facets(teacher.id);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Body({ schema: questionInputSchema }) body: QuestionInput,
  ): Promise<QuestionDto> {
    return this.questions.create(teacher.id, body);
  }

  @Post('bulk')
  @HttpCode(201)
  bulk(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Body({ schema: bulkCreateQuestionsSchema }) body: BulkCreateQuestionsInput,
  ): Promise<BulkCreateResultDto> {
    return this.questions.bulkCreate(teacher.id, body);
  }

  @Post('import/docx')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCX_BYTES } }))
  importDocx(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @UploadedFile() file?: UploadedDocx,
  ): Promise<ParseResult> {
    if (!file) throw new BadRequestException('Chưa chọn file Word');
    const isZip = file.buffer.length > 2 && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b;
    if (!isZip || !/\.docx$/i.test(file.originalname)) {
      throw new BadRequestException('Chỉ hỗ trợ file .docx (Word 2007 trở lên)');
    }
    return this.docx.parse(teacher.id, file.buffer);
  }

  @Get(':id')
  get(@CurrentTeacher() teacher: TeacherPrincipal, @Param('id') id: string): Promise<QuestionDto> {
    return this.questions.get(teacher.id, id);
  }

  @Patch(':id')
  update(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Param('id') id: string,
    @Body({ schema: updateQuestionSchema }) body: UpdateQuestionInput,
  ): Promise<QuestionDto> {
    return this.questions.update(teacher.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentTeacher() teacher: TeacherPrincipal, @Param('id') id: string): Promise<void> {
    return this.questions.remove(teacher.id, id);
  }
}
