import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { TeacherPrincipal } from '../../common/decorators/current-teacher.decorator.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import type { AccessTokenPayload } from './auth.service.js';
import { ACCESS_COOKIE, readBearer, readCookie } from './cookies.js';

/** Guard toàn cục: đọc access token từ cookie `lh_at` hoặc header Bearer; bỏ qua route @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { teacher?: TeacherPrincipal }>();
    const token = readCookie(req, ACCESS_COOKIE) ?? readBearer(req);
    if (!token) throw new UnauthorizedException('Chưa đăng nhập');

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
      req.teacher = { id: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập hết hạn');
    }
    return true;
  }
}
