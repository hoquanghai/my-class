import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';
import { QrService } from './qr.service.js';
import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';

@Module({
  controllers: [ClassesController, StudentsController],
  providers: [ClassesService, StudentsService, QrService],
  exports: [ClassesService],
})
export class ClassesModule {}
