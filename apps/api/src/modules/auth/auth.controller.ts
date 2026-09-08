import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import {
  type AuthProvidersDto,
  type ForgotPasswordInput,
  forgotPasswordSchema,
  type LoginInput,
  loginSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
  type SignupInput,
  signupSchema,
  type TeacherDto,
  type VerifyEmailInput,
  verifyEmailSchema,
} from '@lophoc/shared';
import type { Request, Response } from 'express';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Env } from '../../config/env.js';
import { AuthService, type RequestMeta } from './auth.service.js';
import {
  clearAuthCookies,
  clearOAuthStateCookie,
  OAUTH_STATE_COOKIE,
  readCookie,
  REFRESH_COOKIE,
  setAuthCookies,
  setOAuthStateCookie,
} from './cookies.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import { randomToken } from './tokens.js';

const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

function meta(req: Request): RequestMeta {
  return { userAgent: req.headers['user-agent'] };
}

@Controller('auth')
export class AuthController {
  private readonly secure: boolean;
  private readonly appUrl: string;

  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleOAuthService,
    config: ConfigService<Env, true>,
  ) {
    this.secure = config.get('NODE_ENV', { infer: true }) === 'production';
    this.appUrl = config.get('APP_URL', { infer: true });
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('signup')
  @HttpCode(201)
  async signup(
    @Body({ schema: signupSchema }) body: SignupInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ teacher: TeacherDto }> {
    const result = await this.auth.signup(body, meta(req));
    setAuthCookies(res, result, this.secure);
    return { teacher: result.teacher };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body({ schema: loginSchema }) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ teacher: TeacherDto }> {
    const result = await this.auth.login(body, meta(req));
    setAuthCookies(res, result, this.secure);
    return { teacher: result.teacher };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readCookie(req, REFRESH_COOKIE));
    clearAuthCookies(res, this.secure);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ teacher: TeacherDto }> {
    try {
      const result = await this.auth.refresh(readCookie(req, REFRESH_COOKIE), meta(req));
      setAuthCookies(res, result, this.secure);
      return { teacher: result.teacher };
    } catch (err) {
      clearAuthCookies(res, this.secure);
      throw err;
    }
  }

  @Get('me')
  async me(@CurrentTeacher() teacher: TeacherPrincipal): Promise<{ teacher: TeacherDto }> {
    return { teacher: await this.auth.me(teacher.id) };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body({ schema: verifyEmailSchema }) body: VerifyEmailInput,
  ): Promise<{ verified: true }> {
    await this.auth.verifyEmail(body.token);
    return { verified: true };
  }

  @Throttle(AUTH_THROTTLE)
  @Post('resend-verification')
  @HttpCode(204)
  async resendVerification(@CurrentTeacher() teacher: TeacherPrincipal): Promise<void> {
    await this.auth.resendVerification(teacher.id);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  @HttpCode(204)
  async forgotPassword(
    @Body({ schema: forgotPasswordSchema }) body: ForgotPasswordInput,
  ): Promise<void> {
    await this.auth.forgotPassword(body.email);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body({ schema: resetPasswordSchema }) body: ResetPasswordInput,
  ): Promise<{ reset: true }> {
    await this.auth.resetPassword(body.token, body.password);
    return { reset: true };
  }

  @Public()
  @Get('providers')
  providers(): AuthProvidersDto {
    return { google: this.google.isConfigured(), facebook: false };
  }

  @Public()
  @Get('google')
  googleStart(@Res() res: Response): void {
    if (!this.google.isConfigured()) {
      throw new ServiceUnavailableException('Đăng nhập Google chưa được cấu hình');
    }
    const state = randomToken(16);
    setOAuthStateCookie(res, state, this.secure);
    res.redirect(this.google.authorizeUrl(state));
  }

  @Public()
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const expectedState = readCookie(req, OAUTH_STATE_COOKIE);
    clearOAuthStateCookie(res, this.secure);
    const failure = `${this.appUrl}/login?error=google`;

    if (error || !code || !state || state !== expectedState) {
      res.redirect(failure);
      return;
    }
    try {
      const profile = await this.google.exchangeCode(code);
      const result = await this.auth.loginWithGoogle(profile, meta(req));
      setAuthCookies(res, result, this.secure);
      res.redirect(`${this.appUrl}/app/classes`);
    } catch {
      res.redirect(failure);
    }
  }
}
