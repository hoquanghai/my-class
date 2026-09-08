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
});
