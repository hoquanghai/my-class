import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { StudentPrincipal } from '../../common/decorators/student.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { readBearer, readCookie } from '../auth/cookies.js';

export const STUDENT_COOKIE = 'lh_st';
export const STUDENT_TOKEN_TTL_SEC = 180 * 24 * 60 * 60;

export interface StudentTokenPayload {
  kind: 'student';
  /** deviceId */
  sub: string;
  sid: string;
  cid: string;
}

/** Token thiết bị học sinh: JWT ký bằng JWT_SECRET, hiệu lực 180 ngày, thu hồi qua StudentDevice.revokedAt. */
@Injectable()
export class StudentTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  issue(device: { id: string; studentId: string; classId: string }): Promise<string> {
    const payload: StudentTokenPayload = {
      kind: 'student',
      sub: device.id,
      sid: device.studentId,
      cid: device.classId,
    };
    return this.jwt.signAsync(payload, { expiresIn: STUDENT_TOKEN_TTL_SEC });
  }

  /** Trả principal nếu token hợp lệ và thiết bị chưa bị gỡ; null nếu không. */
  async verify(token: string | undefined): Promise<StudentPrincipal | null> {
    if (!token) return null;
    let payload: StudentTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<StudentTokenPayload>(token);
    } catch {
      return null;
    }
    if (payload.kind !== 'student') return null;
    const device = await this.prisma.studentDevice.findFirst({
      where: { id: payload.sub, revokedAt: null, student: { deletedAt: null } },
      select: { id: true, studentId: true, classId: true },
    });
    if (!device) return null;
    return { deviceId: device.id, studentId: device.studentId, classId: device.classId };
  }

  readToken(req: Request): string | undefined {
    return readCookie(req, STUDENT_COOKIE) ?? readBearer(req);
  }
}
