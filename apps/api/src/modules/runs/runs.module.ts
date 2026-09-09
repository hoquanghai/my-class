import { Module } from '@nestjs/common';
import { QuizzesModule } from '../quizzes/quizzes.module.js';
import { RunsController, SessionRunsController, StudentRunsController } from './runs.controller.js';
import { RunDeadlineService } from './run-deadline.service.js';
import { RunsService } from './runs.service.js';

@Module({
  imports: [QuizzesModule],
  controllers: [SessionRunsController, RunsController, StudentRunsController],
  providers: [RunsService, RunDeadlineService],
  exports: [RunsService],
})
export class RunsModule {}
