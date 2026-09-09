import { Module } from '@nestjs/common';
import { QuizzesModule } from '../quizzes/quizzes.module.js';
import { CommunityController } from './community.controller.js';
import { CommunityService } from './community.service.js';

@Module({
  imports: [QuizzesModule],
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
