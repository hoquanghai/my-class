import { ROSTER_TEMPLATE_COLUMNS, rosterColumnHeader } from '@lophoc/shared';
import ExcelJS from 'exceljs';
import { parseRosterWorkbook } from './excel-roster.parser.js';
import { buildRosterTemplate } from './roster-template.js';

describe('buildRosterTemplate', () => {
  it('tiêu đề ghi rõ bắt buộc/tùy chọn, có sheet hướng dẫn, parser đọc lại đúng cột', async () => {
    const buf = await buildRosterTemplate('Toán 12A1');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
    const ws = wb.getWorksheet('Danh sách');
    expect(ws).toBeDefined();
    const headers = (ws!.getRow(1).values as string[]).slice(1);
    expect(headers).toEqual(['STT', ...ROSTER_TEMPLATE_COLUMNS.map(rosterColumnHeader)]);
    expect(headers[1]).toBe('Họ và tên (bắt buộc)');
    expect(headers.slice(2).every((h) => h.endsWith('(tùy chọn)'))).toBe(true);
    expect(wb.getWorksheet('Hướng dẫn')).toBeDefined();

    ws!.addRow([
      1,
      'Nguyễn Văn An',
      'HS001',
      '15/08/2008',
      'Nữ',
      '0912345678',
      '',
      'THPT A',
      'Bình',
      '0987654321',
      '',
    ]);
    const filled = Buffer.from(await wb.xlsx.writeBuffer());
    await expect(parseRosterWorkbook(filled)).resolves.toEqual([
      {
        name: 'Nguyễn Văn An',
        studentCode: 'HS001',
        dateOfBirth: '2008-08-15',
        gender: 'nu',
        phone: '0912345678',
        school: 'THPT A',
        parentName: 'Bình',
        parentPhone: '0987654321',
      },
    ]);
  });
});
