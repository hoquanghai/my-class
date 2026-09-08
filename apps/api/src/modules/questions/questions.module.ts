import { Module } from '@nestjs/common';
import { DocxImportService } from './docx-import.service.js';
import { QuestionsController } from './questions.controller.js';
import { QuestionsService } from './questions.service.js';

@Module({
  controllers: [QuestionsController],
  providers: [QuestionsService, DocxImportService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
