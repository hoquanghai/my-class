import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../../config/env.js';
import { TeachersModule } from '../teachers/teachers.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { FacebookOAuthService } from './facebook-oauth.service.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
    TeachersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleOAuthService,
    FacebookOAuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
