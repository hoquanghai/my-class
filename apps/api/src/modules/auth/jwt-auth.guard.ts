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
import {
  IS_STUDENT_ROUTE_KEY,
  type StudentPrincipal,
} from '../../common/decorators/student.decorator.js';
import { StudentTokenService } from '../student-auth/student-token.service.js';
import type { AccessTokenPayload } from './auth.service.js';
import { ACCESS_COOKIE, readBearer, readCookie } from './cookies.js';

type AuthedRequest = Request & { teacher?: TeacherPrincipal; student?: StudentPrincipal };

/**
 * Guard toàn cục.
 * - Route @Public(): bỏ qua.
 * - Route @StudentRoute(): xác thực token thiết bị học sinh (cookie `lh_st` hoặc Bearer).
 * - Còn lại: access token giáo viên (cookie `lh_at` hoặc Bearer).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly studentTokens: StudentTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Socket.IO gateway tự xác thực khi kết nối (RtGateway.handleConnection).
    if (context.getType() !== 'http') return true;
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();

    if (this.reflector.getAllAndOverride<boolean>(IS_STUDENT_ROUTE_KEY, targets)) {
      const student = await this.studentTokens.verify(this.studentTokens.readToken(req));
      if (!student) throw new UnauthorizedException('Thiết bị chưa được gắn với học sinh nào');
      req.student = student;
      return true;
    }

    const token = readCookie(req, ACCESS_COOKIE) ?? readBearer(req);
    if (!token) throw new UnauthorizedException('Chưa đăng nhập');
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload & { kind?: string }>(token);
      if (payload.kind === 'student') throw new Error('student token');
      req.teacher = { id: payload.sub, email: payload.email };
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập hết hạn');
    }
    return true;
  }
}
