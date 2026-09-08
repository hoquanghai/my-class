import { Module } from '@nestjs/common';
import { QuizzesModule } from '../quizzes/quizzes.module.js';
import { RunsController, SessionRunsController, StudentRunsController } from './runs.controller.js';
import { RunsService } from './runs.service.js';

@Module({
  imports: [QuizzesModule],
  controllers: [SessionRunsController, RunsController, StudentRunsController],
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
