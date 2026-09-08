import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module.js';
import {
  ClassSessionsController,
  SessionsController,
  StudentAttendanceController,
} from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [ClassesModule],
  controllers: [ClassSessionsController, SessionsController, StudentAttendanceController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
