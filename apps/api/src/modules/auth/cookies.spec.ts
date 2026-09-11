import { safeNextPath } from './cookies.js';

describe('safeNextPath', () => {
  it('chỉ nhận đường dẫn nội bộ trong app', () => {
    expect(safeNextPath('/app/upgrade')).toBe('/app/upgrade');
    expect(safeNextPath('/app/classes?tab=roster')).toBe('/app/classes?tab=roster');
  });

  it('từ chối link ngoài, protocol-relative và giá trị rỗng', () => {
    expect(safeNextPath(undefined)).toBeUndefined();
    expect(safeNextPath('')).toBeUndefined();
    expect(safeNextPath('https://evil.example/app')).toBeUndefined();
    expect(safeNextPath('//evil.example/app')).toBeUndefined();
    expect(safeNextPath(String.raw`/\evil.example`)).toBeUndefined();
    expect(safeNextPath('/'.padEnd(400, 'a'))).toBeUndefined();
  });
});
