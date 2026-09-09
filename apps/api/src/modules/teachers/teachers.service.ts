import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ChangePasswordInput, TeacherDto, UpdateProfileInput } from '@lophoc/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toTeacherDto } from '../auth/auth.service.js';
import { hashPassword, verifyPassword } from '../auth/tokens.js';
import { IMAGE_MIME_EXT, sniffImageMime, StorageService } from '../storage/storage.service.js';

const teacherInclude = { identities: { select: { provider: true } } } as const;

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async me(teacherId: string): Promise<TeacherDto> {
    return toTeacherDto(await this.findOwned(teacherId));
  }

  /** Chỉ cập nhật các trường được gửi lên; trường vắng mặt giữ nguyên. */
  async updateProfile(teacherId: string, input: UpdateProfileInput): Promise<TeacherDto> {
    await this.findOwned(teacherId);
    const teacher = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.school !== undefined && { school: input.school }),
        ...(input.levels !== undefined && { levels: input.levels }),
        ...(input.subjects !== undefined && { subjects: input.subjects }),
      },
      include: teacherInclude,
    });
    return toTeacherDto(teacher);
  }

  /**
   * Đổi mật khẩu. Tài khoản đã có mật khẩu phải nhập mật khẩu hiện tại;
   * tài khoản chỉ dùng Google/Facebook thì đặt mới luôn.
   * Phiên khác bị thu hồi, giữ lại phiên hiện tại (`keepRefreshHash`).
   */
  async changePassword(
    teacherId: string,
    input: ChangePasswordInput,
    keepRefreshHash?: string,
  ): Promise<void> {
    const teacher = await this.findOwned(teacherId);
    if (teacher.passwordHash !== null) {
      const ok =
        input.currentPassword !== undefined &&
        input.currentPassword !== '' &&
        (await verifyPassword(teacher.passwordHash, input.currentPassword));
      if (!ok) throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    await this.prisma.$transaction([
      this.prisma.teacher.update({
        where: { id: teacherId },
        data: { passwordHash: await hashPassword(input.newPassword) },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          teacherId,
          revokedAt: null,
          ...(keepRefreshHash && { tokenHash: { not: keepRefreshHash } }),
        },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /** Ảnh đại diện ≤ 2 MB, PNG/JPG/GIF/WebP. */
  async setAvatar(teacherId: string, buffer: Buffer): Promise<TeacherDto> {
    await this.findOwned(teacherId);
    const mime = sniffImageMime(buffer);
    if (!mime) throw new BadRequestException('Chỉ hỗ trợ ảnh PNG, JPG, GIF, WebP');
    const key = this.storage.buildKey(teacherId, IMAGE_MIME_EXT[mime] as string);
    const url = await this.storage.put(key, buffer, mime);
    const teacher = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { avatarUrl: url },
      include: teacherInclude,
    });
    return toTeacherDto(teacher);
  }

  async removeAvatar(teacherId: string): Promise<TeacherDto> {
    await this.findOwned(teacherId);
    const teacher = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { avatarUrl: null },
      include: teacherInclude,
    });
    return toTeacherDto(teacher);
  }

  private async findOwned(teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, deletedAt: null },
      include: teacherInclude,
    });
    if (!teacher) throw new NotFoundException('Tài khoản không tồn tại');
    return teacher;
  }
}
