import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ErrorCodes, type LoginInput, type SignupInput, type TeacherDto } from '@lophoc/shared';
import type { Env } from '../../config/env.js';
import type { Teacher } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { MailerService } from '../mailer/mailer.service.js';
import { resetPasswordTemplate, verifyEmailTemplate } from '../mailer/templates.js';
import { ACCESS_TTL_SEC, type AuthTokens, REFRESH_TTL_SEC } from './cookies.js';
import type { GoogleProfile } from './google-oauth.service.js';
import { hashPassword, randomToken, sha256, verifyPassword } from './tokens.js';

export interface RequestMeta {
  userAgent?: string;
}

export interface AuthResult extends AuthTokens {
  teacher: TeacherDto;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function toTeacherDto(t: Teacher): TeacherDto {
  return {
    id: t.id,
    email: t.email,
    name: t.name,
    avatarUrl: t.avatarUrl,
    emailVerified: t.emailVerifiedAt !== null,
    plan: t.plan,
  };
}

@Injectable()
export class AuthService {
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mailer: MailerService,
    private readonly analytics: AnalyticsService,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get('APP_URL', { infer: true });
  }

  // ---------- email + mật khẩu ----------

  async signup(input: SignupInput, meta: RequestMeta): Promise<AuthResult> {
    const existing = await this.prisma.teacher.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.EMAIL_TAKEN,
        message: 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng "Quên mật khẩu".',
      });
    }
    const teacher = await this.prisma.teacher.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        acceptedTermsAt: new Date(),
      },
    });
    await this.sendVerification(teacher);
    await this.analytics.track('signup', { provider: 'email' }, teacher.id);
    return this.issueTokens(teacher, meta);
  }

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResult> {
    const teacher = await this.prisma.teacher.findUnique({ where: { email: input.email } });
    const ok =
      teacher !== null &&
      teacher.deletedAt === null &&
      teacher.passwordHash !== null &&
      (await verifyPassword(teacher.passwordHash, input.password));
    if (!ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.issueTokens(teacher, meta);
  }

  // ---------- phiên ----------

  async refresh(rawRefresh: string | undefined, meta: RequestMeta): Promise<AuthResult> {
    if (!rawRefresh) throw new UnauthorizedException('Phiên đăng nhập hết hạn');
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawRefresh) },
      include: { teacher: true },
    });
    const valid =
      row !== null &&
      row.revokedAt === null &&
      row.expiresAt > new Date() &&
      row.teacher.deletedAt === null;
    if (!valid) throw new UnauthorizedException('Phiên đăng nhập hết hạn');

    // Xoay vòng: thu hồi token cũ, cấp cặp mới
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(row.teacher, meta);
  }

  async logout(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(rawRefresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(teacherId: string): Promise<TeacherDto> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, deletedAt: null },
    });
    if (!teacher) throw new UnauthorizedException('Tài khoản không tồn tại');
    return toTeacherDto(teacher);
  }

  async issueTokens(teacher: Teacher, meta: RequestMeta): Promise<AuthResult> {
    const payload: AccessTokenPayload = { sub: teacher.id, email: teacher.email };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: ACCESS_TTL_SEC });
    const refreshToken = randomToken(48);
    await this.prisma.refreshToken.create({
      data: {
        teacherId: teacher.id,
        tokenHash: sha256(refreshToken),
        userAgent: meta.userAgent?.slice(0, 200),
        expiresAt: new Date(Date.now() + REFRESH_TTL_SEC * 1000),
      },
    });
    return { teacher: toTeacherDto(teacher), accessToken, refreshToken };
  }

  // ---------- email token ----------

  private async createEmailToken(
    teacherId: string,
    type: 'verify' | 'reset',
    ttlMs: number,
  ): Promise<string> {
    const raw = randomToken(32);
    await this.prisma.emailToken.create({
      data: { teacherId, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) },
    });
    return raw;
  }

  private async consumeEmailToken(raw: string, type: 'verify' | 'reset'): Promise<string> {
    const row = await this.prisma.emailToken.findUnique({ where: { tokenHash: sha256(raw) } });
    const valid =
      row !== null && row.type === type && row.usedAt === null && row.expiresAt > new Date();
    if (!valid) {
      throw new BadRequestException({
        code: ErrorCodes.INVALID_TOKEN,
        message: 'Liên kết không hợp lệ hoặc đã hết hạn',
      });
    }
    await this.prisma.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
    return row.teacherId;
  }

  private async sendVerification(teacher: Teacher): Promise<void> {
    const raw = await this.createEmailToken(teacher.id, 'verify', VERIFY_TTL_MS);
    const link = `${this.appUrl}/verify-email?token=${raw}`;
    await this.mailer.send({ to: teacher.email, ...verifyEmailTemplate(teacher.name, link) });
  }

  async resendVerification(teacherId: string): Promise<void> {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, deletedAt: null },
    });
    if (!teacher || teacher.emailVerifiedAt) return;
    await this.sendVerification(teacher);
  }

  async verifyEmail(raw: string): Promise<void> {
    const teacherId = await this.consumeEmailToken(raw, 'verify');
    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { emailVerifiedAt: new Date() },
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const teacher = await this.prisma.teacher.findUnique({ where: { email } });
    if (!teacher || teacher.deletedAt) return; // không lộ email có tồn tại hay không
    const raw = await this.createEmailToken(teacher.id, 'reset', RESET_TTL_MS);
    const link = `${this.appUrl}/reset-password?token=${raw}`;
    await this.mailer.send({ to: teacher.email, ...resetPasswordTemplate(teacher.name, link) });
  }

  async resetPassword(raw: string, password: string): Promise<void> {
    const teacherId = await this.consumeEmailToken(raw, 'reset');
    const teacher = await this.prisma.teacher.findUniqueOrThrow({ where: { id: teacherId } });
    await this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        passwordHash: await hashPassword(password),
        // Đặt lại mật khẩu qua email cũng chứng minh sở hữu email
        emailVerifiedAt: teacher.emailVerifiedAt ?? new Date(),
      },
    });
    await this.prisma.refreshToken.updateMany({
      where: { teacherId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---------- Google ----------

  async loginWithGoogle(profile: GoogleProfile, meta: RequestMeta): Promise<AuthResult> {
    const identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUserId: { provider: 'google', providerUserId: profile.sub } },
      include: { teacher: true },
    });

    let teacher: Teacher | null = identity?.teacher ?? null;

    if (!teacher) {
      const byEmail = await this.prisma.teacher.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        // Cùng email đã xác thực ở Google → liên kết vào tài khoản hiện có
        teacher = await this.prisma.teacher.update({
          where: { id: byEmail.id },
          data: {
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            avatarUrl: byEmail.avatarUrl ?? profile.picture,
            identities: { create: { provider: 'google', providerUserId: profile.sub } },
          },
        });
      } else {
        teacher = await this.prisma.teacher.create({
          data: {
            email: profile.email,
            name: profile.name || profile.email.split('@')[0] || 'Giáo viên',
            avatarUrl: profile.picture,
            emailVerifiedAt: new Date(),
            acceptedTermsAt: new Date(),
            identities: { create: { provider: 'google', providerUserId: profile.sub } },
          },
        });
        await this.analytics.track('signup', { provider: 'google' }, teacher.id);
      }
    }

    if (teacher.deletedAt) throw new UnauthorizedException('Tài khoản đã bị xóa');
    return this.issueTokens(teacher, meta);
  }
}
