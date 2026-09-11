import { mediaRef, mediaRefKey } from './media.js';

describe('tham chiếu ảnh media:<key>', () => {
  it('tạo tham chiếu từ key', () => {
    expect(mediaRef('dev/t/gv1/2026/09/abc.png')).toBe('media:dev/t/gv1/2026/09/abc.png');
  });

  it('đọc lại key từ tham chiếu', () => {
    expect(mediaRefKey('media:dev/t/gv1/2026/09/abc.png')).toBe('dev/t/gv1/2026/09/abc.png');
    expect(mediaRefKey('media:/dev/a.png')).toBe('dev/a.png');
  });

  it('giữ nguyên URL tuyệt đối, data: và giá trị rỗng', () => {
    expect(mediaRefKey('https://class.sgp1.digitaloceanspaces.com/a.png')).toBeNull();
    expect(mediaRefKey('data:image/png;base64,iVBOR')).toBeNull();
    expect(mediaRefKey('media:')).toBeNull();
    expect(mediaRefKey(undefined)).toBeNull();
    expect(mediaRefKey(null)).toBeNull();
  });
});
