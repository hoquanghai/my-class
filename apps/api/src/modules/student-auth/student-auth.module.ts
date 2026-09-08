import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { StudentTokenService } from './student-token.service.js';

@Global()
@Module({
  imports: [AuthModule],
  providers: [StudentTokenService],
  exports: [StudentTokenService],
})
export class StudentAuthModule {}
