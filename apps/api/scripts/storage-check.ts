/**
 * Kiểm tra kết nối tới DigitalOcean Spaces bằng chính cấu hình trong `.env.dev` / `.env`:
 * xem Space có tồn tại, thử tải lên một file nhỏ, đọc lại qua URL công khai rồi xóa.
 *
 *   pnpm --filter @lophoc/api storage:check
 */
import { config as loadDotenv } from 'dotenv';
import type { ConfigService } from '@nestjs/config';
import { type Env, validateEnv } from '../src/config/env.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

loadDotenv({ path: ['.env.dev', '.env'] });

const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const fail = (msg: string) => console.error(`  ✗ ${msg}`);

/** Gợi ý sửa cho các lỗi hay gặp của Spaces. */
function explain(err: unknown): string {
  const e = err as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
  const status = e.$metadata?.httpStatusCode;
  const name = e.name ?? '';
  if (name === 'SignatureDoesNotMatch' || name === 'InvalidAccessKeyId' || status === 403) {
    return 'Sai SPACES_KEY hoặc SPACES_SECRET (tạo lại tại https://cloud.digitalocean.com/account/api/spaces).';
  }
  if (name === 'NoSuchBucket' || status === 404) {
    return 'Không thấy Space: kiểm tra SPACES_BUCKET (tên Space) và SPACES_REGION (sgp1, nyc3, fra1…).';
  }
  if (name === 'AccessDenied') {
    return 'Khóa không có quyền với Space này; dùng khóa Full Access hoặc cấp quyền cho đúng Space.';
  }
  return e.message ?? String(err);
}

async function main(): Promise<void> {
  let env: Env;
  try {
    env = validateEnv(process.env);
  } catch (err) {
    fail((err as Error).message);
    process.exit(1);
  }

  // Kiểm tra Spaces kể cả khi STORAGE_DRIVER còn là memory (chưa chuyển hẳn).
  const values: Record<string, unknown> = { ...env, STORAGE_DRIVER: 'spaces' };
  const storage = new StorageService({
    get: (key: string) => values[key],
  } as unknown as ConfigService<Env, true>);
  const info = storage.describe();

  console.log('Cấu hình DigitalOcean Spaces');
  console.log(`  Space (bucket): ${info.bucket}`);
  console.log(`  Vùng:           ${info.region}`);
  console.log(`  Endpoint:       ${info.endpoint}`);
  console.log(`  URL công khai:  ${info.publicUrl}`);
  console.log(`  Tiền tố key:    ${info.prefix || '(không)'}`);
  console.log(`  Driver đang dùng của API: ${env.STORAGE_DRIVER}`);
  console.log('');

  const missing = [
    !env.SPACES_KEY && 'SPACES_KEY',
    !env.SPACES_SECRET && 'SPACES_SECRET',
    !env.SPACES_BUCKET && 'SPACES_BUCKET',
  ].filter(Boolean);
  if (missing.length > 0) {
    fail(`Còn thiếu biến: ${missing.join(', ')} trong apps/api/.env.dev`);
    process.exit(1);
  }

  const key = `${info.prefix}_healthcheck/${Date.now()}.txt`;
  const body = Buffer.from(`lophoc storage check ${new Date().toISOString()}\n`);

  try {
    await storage.checkBucket();
    ok('Kết nối được và Space tồn tại');
  } catch (err) {
    fail(`Không kết nối được: ${explain(err)}`);
    process.exit(1);
  }

  let url: string;
  try {
    url = await storage.put(key, body, 'text/plain; charset=utf-8');
    ok(`Tải lên được: ${key}`);
  } catch (err) {
    fail(`Tải lên thất bại: ${explain(err)}`);
    process.exit(1);
  }

  try {
    const res = await fetch(url);
    if (res.ok && (await res.text()) === body.toString()) ok(`Đọc công khai được: ${url}`);
    else fail(`URL công khai trả ${res.status}. Nếu là 403, bật quyền đọc công khai cho Space.`);
  } catch (err) {
    fail(`Không gọi được URL công khai: ${(err as Error).message}`);
  }

  try {
    await storage.remove(key);
    ok('Xóa file kiểm tra xong');
  } catch (err) {
    fail(`Không xóa được file kiểm tra (${key}): ${explain(err)}`);
  }

  console.log(
    '\nXong. Đặt STORAGE_DRIVER=spaces trong .env.dev rồi khởi động lại API để dùng thật.',
  );
}

await main();
