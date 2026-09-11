import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import {
  normalizePrefix,
  spacesEndpoint,
  spacesPublicUrl,
  StorageService,
} from './storage.service.js';

/** ConfigService giả: chỉ cần `get(key)`. */
function service(env: Partial<Record<string, unknown>>): StorageService {
  return new StorageService({ get: (key: string) => env[key] } as unknown as ConfigService<
    Env,
    true
  >);
}

const spaces = {
  STORAGE_DRIVER: 'spaces',
  SPACES_REGION: 'sgp1',
  SPACES_BUCKET: 'lophoc',
  SPACES_KEY: 'DO00EXAMPLE000000000',
  SPACES_SECRET: 'x'.repeat(43),
  API_URL: 'http://localhost:4000',
};

describe('cấu hình Spaces', () => {
  it('endpoint và URL công khai suy ra từ vùng và tên Space', () => {
    expect(spacesEndpoint('sgp1')).toBe('https://sgp1.digitaloceanspaces.com');
    expect(spacesPublicUrl('sgp1', 'lophoc')).toBe('https://lophoc.sgp1.digitaloceanspaces.com');
    expect(spacesPublicUrl('sgp1', 'lophoc', 'https://media.lophoc.app/')).toBe(
      'https://media.lophoc.app',
    );
  });

  it('tiền tố luôn kết thúc bằng một dấu /', () => {
    expect(normalizePrefix(undefined)).toBe('');
    expect(normalizePrefix('')).toBe('');
    expect(normalizePrefix('dev')).toBe('dev/');
    expect(normalizePrefix('/dev/')).toBe('dev/');
  });
});

describe('StorageService', () => {
  it('spaces: key có tiền tố, URL công khai theo tên miền của Space', () => {
    const s = service({ ...spaces, SPACES_PREFIX: 'dev' });
    const key = s.buildKey('teacher1', 'png');
    expect(key).toMatch(/^dev\/t\/teacher1\/\d{4}\/\d{2}\/[\w-]+\.png$/);
    expect(s.url(key)).toBe(`https://lophoc.sgp1.digitaloceanspaces.com/${key}`);
    expect(s.describe()).toMatchObject({
      bucket: 'lophoc',
      region: 'sgp1',
      endpoint: 'https://sgp1.digitaloceanspaces.com',
      prefix: 'dev/',
    });
  });

  it('spaces: SPACES_PUBLIC_URL ghi đè (CDN hoặc tên miền riêng)', () => {
    const s = service({
      ...spaces,
      SPACES_PUBLIC_URL: 'https://lophoc.sgp1.cdn.digitaloceanspaces.com',
    });
    expect(s.url('a/b.png')).toBe('https://lophoc.sgp1.cdn.digitaloceanspaces.com/a/b.png');
  });

  it('memory: lưu trong RAM và trả URL do API phục vụ', async () => {
    const s = service({ ...spaces, STORAGE_DRIVER: 'memory' });
    const url = await s.put('t/a.png', Buffer.from('x'), 'image/png');
    expect(url).toBe('http://localhost:4000/api/media/mem/t/a.png');
    expect(await s.get('t/a.png')).toEqual({ body: Buffer.from('x'), mime: 'image/png' });
    await s.remove('t/a.png');
    expect(s.getFromMemory('t/a.png')).toBeUndefined();
  });
});
