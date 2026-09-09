import { Module } from '@nestjs/common';
import { ClassesModule } from '../classes/classes.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { StudentProfileController } from './student-profile.controller.js';
import { StudentProfileService } from './student-profile.service.js';

/** Tách khỏi ClassesModule vì cần SessionsService (SessionsModule đã import ClassesModule). */
@Module({
  imports: [ClassesModule, SessionsModule],
  controllers: [StudentProfileController],
  providers: [StudentProfileService],
})
export class StudentProfileModule {}
