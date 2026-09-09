import { type Gender, parseDateInput, type RosterField, stripDiacritics } from '@lophoc/shared';
import ExcelJS from 'exceljs';

/** Một dòng học sinh đọc từ Excel; chỉ `name` bắt buộc, trường khác có khi có dữ liệu. */
export interface RosterRow {
  name: string;
  studentCode?: string;
  dateOfBirth?: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  school?: string;
  parentName?: string;
  parentPhone?: string;
  note?: string;
}

type ColumnMap = Partial<Record<RosterField, number>>;
type HeaderTest = (header: string) => boolean;

const HEADER_SCAN_ROWS = 5;
const MAX = {
  name: 200,
  studentCode: 50,
  phone: 20,
  email: 120,
  school: 120,
  parentName: 100,
  note: 500,
} as const;

const PHONE = /sdt|so\s*dien\s*thoai|dien\s*thoai|phone|\btel\b|mobile/;
const PARENT = /phu\s*huynh|\bcha\b|\bme\b|\bbo\b|giam\s*ho|parent|guardian/;
const STUDENT = /hoc\s*sinh|\bhs\b|student/;
const NAME = /ho\s*(va|&)?\s*ten|^ten\b|\bten\b|name/;

/** Mẫu cụ thể xét trước (tên/SĐT phụ huynh, SĐT học sinh) để không nhầm với cột tên/điện thoại chung. */
const SPECIFIC: ReadonlyArray<[RosterField, HeaderTest]> = [
  ['parentName', (h) => PARENT.test(h) && NAME.test(h)],
  ['parentPhone', (h) => PARENT.test(h) && PHONE.test(h)],
  ['phone', (h) => STUDENT.test(h) && PHONE.test(h)],
  ['email', (h) => /e-?mail/.test(h)],
  ['studentCode', (h) => /ma\s*(hoc\s*sinh|hs|so)|student\s*(id|code)|^ma$|^id$|^code$/.test(h)],
  ['dateOfBirth', (h) => /ngay\s*sinh|birth|\bdob\b/.test(h)],
  ['gender', (h) => /gioi\s*tinh|gender|\bsex\b/.test(h)],
  ['school', (h) => /truong|school/.test(h)],
  ['note', (h) => /ghi\s*chu|\bnote|remark/.test(h)],
  ['name', (h) => NAME.test(h) && !PARENT.test(h)],
];

/** Cột "Điện thoại"/"Phụ huynh" không ghi rõ của ai: coi là SĐT phụ huynh (như trước đây). */
const FALLBACK: ReadonlyArray<[RosterField, HeaderTest]> = [
  ['parentPhone', (h) => PHONE.test(h) || PARENT.test(h)],
];

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

function normalizeHeader(text: string): string {
  return stripDiacritics(text).toLowerCase().replace(/\s+/g, ' ').trim();
}

function classify(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const used = new Set<number>();
  for (const list of [SPECIFIC, FALLBACK]) {
    headers.forEach((h, idx) => {
      if (!h || used.has(idx)) return;
      const hit = list.find(([field, test]) => map[field] === undefined && test(h));
      if (hit) {
        map[hit[0]] = idx + 1;
        used.add(idx);
      }
    });
  }
  return map;
}

function rowHeaders(row: ExcelJS.Row): string[] {
  const headers: string[] = [];
  for (let c = 1; c <= row.cellCount; c++) headers.push(normalizeHeader(cellText(row.getCell(c))));
  return headers;
}

function text(row: ExcelJS.Row, col: number | undefined, max: number): string {
  if (!col) return '';
  return cellText(row.getCell(col)).replace(/\s+/g, ' ').trim().slice(0, max);
}

function phone(row: ExcelJS.Row, col: number | undefined): string {
  if (!col) return '';
  return cellText(row.getCell(col))
    .replace(/[\s.()-]/g, '')
    .slice(0, MAX.phone);
}

function isoDate(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

function readDate(row: ExcelJS.Row, col: number | undefined): string | null {
  if (!col) return null;
  const v = row.getCell(col).value;
  if (v instanceof Date) return parseDateInput(isoDate(v));
  const t = cellText(row.getCell(col)).trim();
  return t ? parseDateInput(t) : null;
}

const GENDER_WORDS: Record<Gender, readonly string[]> = {
  nam: ['nam', 'male', 'm', 'boy', 'trai'],
  nu: ['nu', 'female', 'f', 'girl', 'gai'],
  khac: ['khac', 'other', 'x'],
};

export function parseGender(input: string): Gender | null {
  const g = stripDiacritics(input).toLowerCase().trim();
  for (const [gender, words] of Object.entries(GENDER_WORDS) as [Gender, readonly string[]][]) {
    if (words.includes(g)) return gender;
  }
  return null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function email(row: ExcelJS.Row, col: number | undefined): string {
  if (!col) return '';
  const v = cellText(row.getCell(col)).trim().toLowerCase().slice(0, MAX.email);
  return EMAIL.test(v) ? v : '';
}

function readRow(row: ExcelJS.Row, cols: ColumnMap): RosterRow | null {
  const name = text(row, cols.name ?? 1, MAX.name);
  if (!name) return null;
  const out: RosterRow = { name };
  const put = <K extends keyof RosterRow>(key: K, value: RosterRow[K] | '' | null) => {
    if (value) out[key] = value;
  };
  put('studentCode', text(row, cols.studentCode, MAX.studentCode));
  put('dateOfBirth', readDate(row, cols.dateOfBirth));
  put('gender', cols.gender ? parseGender(cellText(row.getCell(cols.gender))) : null);
  put('phone', phone(row, cols.phone));
  put('email', email(row, cols.email));
  put('school', text(row, cols.school, MAX.school));
  put('parentName', text(row, cols.parentName, MAX.parentName));
  put('parentPhone', phone(row, cols.parentPhone));
  put('note', text(row, cols.note, MAX.note));
  return out;
}

/**
 * Đọc danh sách học sinh từ file .xlsx (sheet đầu tiên).
 * Tìm dòng tiêu đề trong 5 dòng đầu có ô "Họ và tên"/"Tên"/"Name"; các cột khác
 * (mã HS, ngày sinh, giới tính, SĐT, email, trường, phụ huynh, ghi chú) nhận diện theo tiêu đề
 * và đều tùy chọn. Không thấy tiêu đề thì coi cột A là tên.
 */
export async function parseRosterWorkbook(buffer: Buffer): Promise<RosterRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  let headerRow = 0;
  let cols: ColumnMap = {};
  for (let r = 1; r <= Math.min(HEADER_SCAN_ROWS, sheet.rowCount); r++) {
    const candidate = classify(rowHeaders(sheet.getRow(r)));
    if (candidate.name) {
      headerRow = r;
      cols = candidate;
      break;
    }
  }

  const rows: RosterRow[] = [];
  for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
    const row = readRow(sheet.getRow(r), cols);
    if (row) rows.push(row);
  }
  return rows;
}
