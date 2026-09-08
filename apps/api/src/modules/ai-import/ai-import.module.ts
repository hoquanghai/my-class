import { Module } from '@nestjs/common';
import { AiImportController } from './ai-import.controller.js';
import { AiImportProcessor } from './ai-import.processor.js';
import { AiImportQueue } from './ai-import.queue.js';
import { AiImportService } from './ai-import.service.js';
import { ExtractorFactory } from './extractor.factory.js';

@Module({
  controllers: [AiImportController],
  providers: [ExtractorFactory, AiImportProcessor, AiImportQueue, AiImportService],
})
export class AiImportModule {}
