import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';

export const IS_STUDENT_ROUTE_KEY = 'isStudentRoute';

/** Route dành cho học sinh: xác thực bằng token thiết bị (cookie `lh_st` hoặc Bearer). */
export const StudentRoute = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_STUDENT_ROUTE_KEY, true);

export interface StudentPrincipal {
  deviceId: string;
  studentId: string;
  classId: string;
}

export const CurrentStudent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StudentPrincipal => {
    const req = ctx.switchToHttp().getRequest<{ student?: StudentPrincipal }>();
    if (!req.student) throw new UnauthorizedException();
    return req.student;
  },
);
