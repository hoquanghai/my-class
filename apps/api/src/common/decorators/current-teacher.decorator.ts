import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface TeacherPrincipal {
  id: string;
  email: string;
}

/** Lấy giáo viên đã xác thực từ request (do JwtAuthGuard gán). */
export const CurrentTeacher = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TeacherPrincipal => {
    const req = ctx.switchToHttp().getRequest<{ teacher?: TeacherPrincipal }>();
    if (!req.teacher) throw new UnauthorizedException();
    return req.teacher;
  },
);
