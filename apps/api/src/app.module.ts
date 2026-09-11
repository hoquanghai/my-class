import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpThrottlerGuard } from './common/http-throttler.guard.js';
import { validateEnv } from './config/env.js';
import { AiImportModule } from './modules/ai-import/ai-import.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { ClassesModule } from './modules/classes/classes.module.js';
import { CommunityModule } from './modules/community/community.module.js';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { JoinModule } from './modules/join/join.module.js';
import { MailerModule } from './modules/mailer/mailer.module.js';
import { QuizzesModule } from './modules/quizzes/quizzes.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { RunsModule } from './modules/runs/runs.module.js';
import { StudentAuthModule } from './modules/student-auth/student-auth.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { QuestionsModule } from './modules/questions/questions.module.js';
import { SessionsModule } from './modules/sessions/sessions.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { StudentProfileModule } from './modules/student-profile/student-profile.module.js';
import { TeachersModule } from './modules/teachers/teachers.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Dev: `.env.dev` (cá nhân, gitignore) ưu tiên hơn `.env`; file đứng trước thắng khi trùng biến.
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : ['.env.dev', '.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      // Test e2e đặt THROTTLE_SKIP=true để không vướng giới hạn; riêng test rate-limit bật lại.
      skipIf: () => process.env.THROTTLE_SKIP === 'true',
    }),
    PrismaModule,
    FeatureFlagsModule,
    MailerModule,
    StorageModule,
    AnalyticsModule,
    AuthModule,
    StudentAuthModule,
    TeachersModule,
    ClassesModule,
    SessionsModule,
    StudentProfileModule,
    CommunityModule,
    BillingModule,
    QuestionsModule,
    AiImportModule,
    QuizzesModule,
    JoinModule,
    RealtimeModule,
    RunsModule,
    MediaModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: HttpThrottlerGuard }],
})
export class AppModule {}
