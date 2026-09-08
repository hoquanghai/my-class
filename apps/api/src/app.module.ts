import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ClassesModule } from './modules/classes/classes.module.js';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MailerModule } from './modules/mailer/mailer.module.js';
import { TeachersModule } from './modules/teachers/teachers.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
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
    AnalyticsModule,
    AuthModule,
    TeachersModule,
    ClassesModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
