import { randomBytes } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Env } from '../../config/env.js';

export const IMAGE_MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/** Nhận diện ảnh bằng magic bytes (không tin mimetype do client gửi). */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/**
 * Lưu file lên object storage (MinIO ở dev, R2 ở prod) và trả URL công khai.
 * `STORAGE_DRIVER=memory` giữ file trong RAM cho test.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly memory = new Map<string, { body: Buffer; mime: string }>();

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    const apiUrl = config.get('API_URL', { infer: true });
    if (config.get('STORAGE_DRIVER', { infer: true }) === 'memory') {
      this.client = null;
      this.publicUrl = `${apiUrl}/api/media/mem`;
      return;
    }
    const accessKeyId = config.get('S3_ACCESS_KEY', { infer: true });
    const secretAccessKey = config.get('S3_SECRET_KEY', { infer: true });
    this.client = new S3Client({
      region: config.get('S3_REGION', { infer: true }),
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
    this.publicUrl =
      config.get('S3_PUBLIC_URL', { infer: true }) ??
      `${config.get('S3_ENDPOINT', { infer: true }) ?? ''}/${this.bucket}`;
  }

  /** Key dạng t/<teacherId>/<yyyy>/<mm>/<random>.<ext> */
  buildKey(teacherId: string, ext: string): string {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `t/${teacherId}/${yyyy}/${mm}/${randomBytes(9).toString('base64url')}.${ext}`;
  }

  url(key: string): string {
    return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
  }

  async put(key: string, body: Buffer, mime: string): Promise<string> {
    if (!this.client) {
      this.memory.set(key, { body, mime });
      return this.url(key);
    }
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mime }),
    );
    return this.url(key);
  }

  /** Chỉ dùng trong test (driver memory). */
  getFromMemory(key: string): { body: Buffer; mime: string } | undefined {
    return this.memory.get(key);
  }
}
