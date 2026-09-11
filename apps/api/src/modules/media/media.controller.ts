import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MediaUploadDto } from '@lophoc/shared';
import type { Response } from 'express';
import {
  CurrentTeacher,
  type TeacherPrincipal,
} from '../../common/decorators/current-teacher.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { IMAGE_MIME_EXT, sniffImageMime, StorageService } from '../storage/storage.service.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Trình duyệt nhớ đích chuyển hướng 1 giờ; đủ để không hỏi lại liên tục, vẫn đổi được cấu hình nhanh. */
const REDIRECT_CACHE_CONTROL = 'public, max-age=3600';

interface UploadedImage {
  buffer: Buffer;
  originalname: string;
  size: number;
}

@Controller('media')
export class MediaController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  /** Tải ảnh (png/jpg/gif/webp ≤ 5 MB) dùng cho câu hỏi. */
  @Post('upload')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async upload(
    @CurrentTeacher() teacher: TeacherPrincipal,
    @UploadedFile() file?: UploadedImage,
  ): Promise<MediaUploadDto> {
    if (!file) throw new BadRequestException('Chưa chọn ảnh');
    const mime = sniffImageMime(file.buffer);
    if (!mime) throw new BadRequestException('Chỉ hỗ trợ ảnh PNG, JPG, GIF, WebP');
    const key = this.storage.buildKey(teacher.id, IMAGE_MIME_EXT[mime] as string);
    const url = await this.storage.put(key, file.buffer, mime);
    await this.prisma.mediaFile.create({
      data: { teacherId: teacher.id, key, mime, sizeBytes: file.size },
    });
    return { key, url };
  }

  /**
   * Phục vụ file theo key, dùng cho tham chiếu `media:<key>` trong nội dung câu hỏi.
   * Driver `spaces`: chuyển hướng sang URL công khai (đổi nhà cung cấp chỉ cần đổi cấu hình,
   * nội dung cũ không phải sửa). Driver `memory`: trả thẳng bytes.
   */
  @Public()
  @Get('f/*path')
  serve(@Param('path') path: string | string[], @Res() res: Response): void {
    const key = Array.isArray(path) ? path.join('/') : path;
    const target = this.storage.externalUrl(key);
    if (target) {
      res.setHeader('Cache-Control', REDIRECT_CACHE_CONTROL);
      res.redirect(302, target);
      return;
    }
    const found = this.storage.getFromMemory(key);
    if (!found) throw new NotFoundException();
    res.setHeader('Content-Type', found.mime);
    res.end(found.body);
  }
}
