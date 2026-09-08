import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module.js';
import { JoinController } from './join.controller.js';
import { JoinService } from './join.service.js';

@Module({
  imports: [ClassesModule],
  controllers: [JoinController],
  providers: [JoinService],
  exports: [JoinService],
})
export class JoinModule {}
