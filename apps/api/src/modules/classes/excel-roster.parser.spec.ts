import { ROSTER_TEMPLATE_COLUMNS, rosterColumnHeader } from '@lophoc/shared';
import ExcelJS from 'exceljs';
import { parseRosterWorkbook } from './excel-roster.parser.js';

async function buildXlsx(rows: unknown[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('DS');
  for (const r of rows) ws.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('parseRosterWorkbook', () => {
  it('đọc theo tiêu đề "Họ và tên" và cột SĐT phụ huynh', async () => {
    const buf = await buildXlsx([
      ['STT', 'Họ và tên', 'SĐT phụ huynh'],
      [1, 'Nguyễn Văn An', '0901 234 567'],
      [2, 'Trần  Thị Bình', ''],
      [3, '', '0900000000'],
    ]);
    await expect(parseRosterWorkbook(buf)).resolves.toEqual([
      { name: 'Nguyễn Văn An', parentPhone: '0901234567' },
      { name: 'Trần Thị Bình' },
    ]);
  });

  it('tiêu đề nằm ở dòng 2 sau dòng tên lớp; tiêu đề không dấu "Ten hoc sinh"', async () => {
    const buf = await buildXlsx([
      ['DANH SÁCH LỚP 9A'],
      ['TT', 'Ten hoc sinh', 'Dien thoai'],
      [1, 'Lê Minh Châu', 912345678],
    ]);
    await expect(parseRosterWorkbook(buf)).resolves.toEqual([
      { name: 'Lê Minh Châu', parentPhone: '912345678' },
    ]);
  });

  it('không có tiêu đề: cột A là tên', async () => {
    const buf = await buildXlsx([['Phạm Quốc Dũng'], ['Hoàng Thu Hà'], ['']]);
    await expect(parseRosterWorkbook(buf)).resolves.toEqual([
      { name: 'Phạm Quốc Dũng' },
      { name: 'Hoàng Thu Hà' },
    ]);
  });

  it('sheet rỗng → []', async () => {
    await expect(parseRosterWorkbook(await buildXlsx([]))).resolves.toEqual([]);
  });
  it('đọc đủ cột của file mẫu: ngày sinh dạng Date lẫn chữ, giới tính, email không hợp lệ bị bỏ', async () => {
    const buf = await buildXlsx([
      ['STT', ...ROSTER_TEMPLATE_COLUMNS.map(rosterColumnHeader)],
      [
        1,
        'Nguyễn Văn An',
        'HS001',
        new Date(Date.UTC(2008, 7, 15)),
        'Nam',
        '0912 345 678',
        'An.Nguyen@Example.com',
        'THPT Nguyễn Huệ',
        'Nguyễn Văn Bình',
        '0987654321',
        'Học tốt hình học',
      ],
      [2, 'Trần Thị Bình', '', '5/3/2009', 'nữ', '', 'khong-phai-email', '', '', '', ''],
    ]);
    await expect(parseRosterWorkbook(buf)).resolves.toEqual([
      {
        name: 'Nguyễn Văn An',
        studentCode: 'HS001',
        dateOfBirth: '2008-08-15',
        gender: 'nam',
        phone: '0912345678',
        email: 'an.nguyen@example.com',
        school: 'THPT Nguyễn Huệ',
        parentName: 'Nguyễn Văn Bình',
        parentPhone: '0987654321',
        note: 'Học tốt hình học',
      },
      { name: 'Trần Thị Bình', dateOfBirth: '2009-03-05', gender: 'nu' },
    ]);
  });

  it('"Tên phụ huynh" không bị nhầm thành cột tên; "Điện thoại" chung là SĐT phụ huynh', async () => {
    const buf = await buildXlsx([
      ['Tên phụ huynh', 'Họ tên học sinh', 'Điện thoại'],
      ['Lê Văn Cha', 'Lê Minh Châu', '0900000001'],
    ]);
    await expect(parseRosterWorkbook(buf)).resolves.toEqual([
      { name: 'Lê Minh Châu', parentName: 'Lê Văn Cha', parentPhone: '0900000001' },
    ]);
  });
});
