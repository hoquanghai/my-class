import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
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
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export function isPdf(buf: Buffer): boolean {
  return buf.length > 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-';
}

export interface StoredObject {
  body: Buffer;
  mime: string;
}

/** Địa chỉ API của Spaces theo vùng, ví dụ `https://sgp1.digitaloceanspaces.com`. */
export function spacesEndpoint(region: string, override?: string): string {
  return (override || `https://${region}.digitaloceanspaces.com`).replace(/\/+$/, '');
}

/**
 * URL công khai để đọc file. Mặc định là tên miền virtual-hosted của Space
 * (`https://<space>.<region>.digitaloceanspaces.com`); đặt `SPACES_PUBLIC_URL` khi bật CDN
 * (`…cdn.digitaloceanspaces.com`) hoặc dùng tên miền riêng.
 */
export function spacesPublicUrl(region: string, bucket: string, override?: string): string {
  return (override || `https://${bucket}.${region}.digitaloceanspaces.com`).replace(/\/+$/, '');
}

/** Tiền tố thư mục: bỏ dấu `/` thừa, luôn kết thúc bằng `/` (rỗng nếu không đặt). */
export function normalizePrefix(prefix: string | undefined): string {
  const trimmed = (prefix ?? '').replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? '' : `${trimmed}/`;
}

/** File ảnh có key ngẫu nhiên nên không bao giờ đổi nội dung: cho phép cache dài. */
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * Lưu file lên DigitalOcean Spaces (API tương thích S3) và trả URL công khai.
 * `STORAGE_DRIVER=memory` giữ file trong RAM cho test và khi chưa điền khóa Spaces.
 *
 * Lưu ý: object trên Spaces mặc định là riêng tư, nên `put()` luôn gắn ACL `public-read`
 * để URL trả về đọc được từ trình duyệt học sinh.
 */
@Injectable()
export class StorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly prefix: string;
  private readonly endpoint: string;
  private readonly region: string;
  private readonly memory = new Map<string, StoredObject>();

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('SPACES_BUCKET', { infer: true });
    this.region = config.get('SPACES_REGION', { infer: true });
    this.prefix = normalizePrefix(config.get('SPACES_PREFIX', { infer: true }));
    this.endpoint = spacesEndpoint(this.region, config.get('SPACES_ENDPOINT', { infer: true }));

    if (config.get('STORAGE_DRIVER', { infer: true }) === 'memory') {
      this.client = null;
      this.publicUrl = `${config.get('API_URL', { infer: true })}/api/media/mem`;
      return;
    }
    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      // Spaces dùng virtual-hosted style: https://<space>.<region>.digitaloceanspaces.com/<key>
      forcePathStyle: false,
      credentials: {
        accessKeyId: config.get('SPACES_KEY', { infer: true }) ?? '',
        secretAccessKey: config.get('SPACES_SECRET', { infer: true }) ?? '',
      },
    });
    this.publicUrl = spacesPublicUrl(
      this.region,
      this.bucket,
      config.get('SPACES_PUBLIC_URL', { infer: true }),
    );
  }

  /** Thông tin cấu hình để in ra khi kiểm tra kết nối (không chứa khóa bí mật). */
  describe(): {
    bucket: string;
    region: string;
    endpoint: string;
    publicUrl: string;
    prefix: string;
  } {
    return {
      bucket: this.bucket,
      region: this.region,
      endpoint: this.endpoint,
      publicUrl: this.publicUrl,
      prefix: this.prefix,
    };
  }

  /** Key dạng `<prefix>t/<teacherId>/<yyyy>/<mm>/<random>.<ext>` */
  buildKey(teacherId: string, ext: string): string {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${this.prefix}t/${teacherId}/${yyyy}/${mm}/${randomBytes(9).toString('base64url')}.${ext}`;
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
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mime,
        ACL: 'public-read',
        CacheControl: CACHE_CONTROL,
      }),
    );
    return this.url(key);
  }

  async get(key: string): Promise<StoredObject | null> {
    if (!this.client) return this.memory.get(key) ?? null;
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return { body: Buffer.from(bytes), mime: res.ContentType ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.client) {
      this.memory.delete(key);
      return;
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /** Ném lỗi nếu khóa sai hoặc Space không tồn tại; dùng cho lệnh kiểm tra kết nối. */
  async checkBucket(): Promise<void> {
    if (!this.client) return;
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  /** Chỉ dùng trong test (driver memory). */
  getFromMemory(key: string): StoredObject | undefined {
    return this.memory.get(key);
  }
}
