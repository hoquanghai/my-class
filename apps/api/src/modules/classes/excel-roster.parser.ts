import { stripDiacritics } from '@lophoc/shared';
import ExcelJS from 'exceljs';

export interface RosterRow {
  name: string;
  parentPhone?: string;
}

const NAME_HEADER = /ho\s*(va|&)?\s*ten|^ten\b|\bten\b|name/i;
const PHONE_HEADER = /sdt|dien\s*thoai|phone|phu\s*huynh/i;
const HEADER_SCAN_ROWS = 5;
const MAX_NAME = 200;
const MAX_PHONE = 20;

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('result' in v) return v.result === undefined || v.result === null ? '' : String(v.result);
    if ('text' in v) return String(v.text);
    return '';
  }
  return String(v);
}

function isHeaderLike(text: string, pattern: RegExp): boolean {
  return pattern.test(stripDiacritics(text).toLowerCase().trim());
}

/**
 * Đọc danh sách học sinh từ file .xlsx (sheet đầu tiên).
 * Tìm dòng tiêu đề trong 5 dòng đầu có ô "Họ và tên"/"Tên"/"Name"; cột điện thoại phụ huynh là tùy chọn.
 * Không thấy tiêu đề thì coi cột A là tên.
 */
export async function parseRosterWorkbook(buffer: Buffer): Promise<RosterRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  let headerRow = 0;
  let nameCol = 1;
  let phoneCol = 0;
  for (let r = 1; r <= Math.min(HEADER_SCAN_ROWS, sheet.rowCount); r++) {
    let foundName = 0;
    let foundPhone = 0;
    sheet.getRow(r).eachCell((cell, col) => {
      const text = cellText(cell);
      if (!foundName && isHeaderLike(text, NAME_HEADER)) foundName = col;
      else if (!foundPhone && isHeaderLike(text, PHONE_HEADER)) foundPhone = col;
    });
    if (foundName) {
      headerRow = r;
      nameCol = foundName;
      phoneCol = foundPhone;
      break;
    }
  }

  const rows: RosterRow[] = [];
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const name = cellText(row.getCell(nameCol)).replace(/\s+/g, ' ').trim();
    if (!name) continue;
    const phone = phoneCol ? cellText(row.getCell(phoneCol)).replace(/\s+/g, '').trim() : '';
    rows.push(
      phone
        ? { name: name.slice(0, MAX_NAME), parentPhone: phone.slice(0, MAX_PHONE) }
        : { name: name.slice(0, MAX_NAME) },
    );
  }
  return rows;
}
