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
  type ChangePasswordInput,
  changePasswordSchema,
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
import { TeachersService } from '../teachers/teachers.service.js';
import { AuthService, type RequestMeta } from './auth.service.js';
import {
  clearAuthCookies,
  clearOAuthNextCookie,
  clearOAuthStateCookie,
  OAUTH_NEXT_COOKIE,
  OAUTH_STATE_COOKIE,
  readCookie,
  REFRESH_COOKIE,
  safeNextPath,
  setAuthCookies,
  setOAuthNextCookie,
  setOAuthStateCookie,
} from './cookies.js';
import { FacebookOAuthService } from './facebook-oauth.service.js';
import { GoogleOAuthService } from './google-oauth.service.js';
import type { OAuthProvider, OAuthProviderService } from './oauth-profile.js';
import { randomToken, sha256 } from './tokens.js';

const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

function meta(req: Request): RequestMeta {
  return { userAgent: req.headers['user-agent'] };
}

function providerLabel(provider: OAuthProvider): string {
  return provider === 'google' ? 'Google' : 'Facebook';
}

@Controller('auth')
export class AuthController {
  private readonly secure: boolean;
  private readonly appUrl: string;

  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleOAuthService,
    private readonly facebook: FacebookOAuthService,
    private readonly teachers: TeachersService,
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

  /**
   * Đổi/đặt mật khẩu. Đặt dưới /auth để nhận được cookie refresh (path /api/auth),
   * nhờ đó giữ lại phiên hiện tại và chỉ thu hồi các phiên khác.
   */
  @Throttle(AUTH_THROTTLE)
  @Post('password')
  @HttpCode(200)
  async changePassword(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @Body({ schema: changePasswordSchema }) body: ChangePasswordInput,
    @Req() req: Request,
  ): Promise<{ changed: true }> {
    const refresh = readCookie(req, REFRESH_COOKIE);
    await this.teachers.changePassword(teacher.id, body, refresh ? sha256(refresh) : undefined);
    return { changed: true };
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
    return { google: this.google.isConfigured(), facebook: this.facebook.isConfigured() };
  }

  @Public()
  @Get('google')
  googleStart(@Query('next') next: string | undefined, @Res() res: Response): void {
    this.oauthStart(this.google, res, next);
  }

  @Public()
  @Get('google/callback')
  googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    return this.oauthCallback(this.google, { code, state, error }, req, res);
  }

  @Public()
  @Get('facebook')
  facebookStart(@Query('next') next: string | undefined, @Res() res: Response): void {
    this.oauthStart(this.facebook, res, next);
  }

  @Public()
  @Get('facebook/callback')
  facebookCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    return this.oauthCallback(this.facebook, { code, state, error }, req, res);
  }

  /**
   * Bắt đầu luồng OAuth: sinh state chống CSRF, lưu cookie rồi chuyển hướng tới nhà cung cấp.
   * `next` (trang trong app, ví dụ /app/upgrade) được giữ trong cookie để callback quay lại đúng chỗ.
   */
  private oauthStart(service: OAuthProviderService, res: Response, next?: string): void {
    if (!service.isConfigured()) {
      throw new ServiceUnavailableException(
        `Đăng nhập ${providerLabel(service.provider)} chưa được cấu hình`,
      );
    }
    const state = randomToken(16);
    setOAuthStateCookie(res, state, this.secure);
    const target = safeNextPath(next);
    if (target) setOAuthNextCookie(res, target, this.secure);
    else clearOAuthNextCookie(res, this.secure);
    res.redirect(service.authorizeUrl(state));
  }

  /** Nhận mã từ nhà cung cấp; mọi lỗi đều đưa về /login?error=<provider> để web hiện thông báo. */
  private async oauthCallback(
    service: OAuthProviderService,
    query: { code?: string; state?: string; error?: string },
    req: Request,
    res: Response,
  ): Promise<void> {
    const expectedState = readCookie(req, OAUTH_STATE_COOKIE);
    const next = safeNextPath(readCookie(req, OAUTH_NEXT_COOKIE)) ?? '/app/classes';
    clearOAuthStateCookie(res, this.secure);
    clearOAuthNextCookie(res, this.secure);
    const failure = `${this.appUrl}/login?error=${service.provider}`;

    if (query.error || !query.code || !query.state || query.state !== expectedState) {
      res.redirect(failure);
      return;
    }
    try {
      const profile = await service.exchangeCode(query.code);
      const result = await this.auth.loginWithOAuth(service.provider, profile, meta(req));
      setAuthCookies(res, result, this.secure);
      res.redirect(`${this.appUrl}${next}`);
    } catch {
      res.redirect(failure);
    }
  }
}
