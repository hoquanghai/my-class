import {
  GENDER_LABELS,
  GENDERS,
  ROSTER_TEMPLATE_COLUMNS,
  rosterColumnHeader,
} from '@lophoc/shared';
import ExcelJS from 'exceljs';

const DATA_ROWS = 500;
const FILL_REQUIRED = 'FFFFE8A3'; // vàng nhạt: cột bắt buộc
const FILL_OPTIONAL = 'FFEAF0FD'; // accent-soft: cột tùy chọn
const TEXT_FORMAT = '@';

/** exceljs có `worksheet.dataValidations` lúc chạy nhưng typings 4.x chưa khai báo. */
interface WithDataValidations {
  dataValidations: { add(range: string, validation: ExcelJS.DataValidation): void };
}

/**
 * File Excel mẫu để giáo viên nhập danh sách: sheet "Danh sách" có đủ cột, tiêu đề ghi rõ
 * (bắt buộc)/(tùy chọn), cột SĐT ở dạng chữ để giữ số 0 đầu, giới tính chọn từ danh sách,
 * ngày sinh dạng ngày/tháng/năm; sheet "Hướng dẫn" giải thích từng cột kèm ví dụ.
 */
export async function buildRosterTemplate(className: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Lớp Học';
  wb.created = new Date();

  const ws = wb.addWorksheet('Danh sách', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'STT', key: 'index', width: 6 },
    ...ROSTER_TEMPLATE_COLUMNS.map((c) => ({
      header: rosterColumnHeader(c),
      key: c.key,
      width: c.width,
    })),
  ];

  const header = ws.getRow(1);
  header.height = 34;
  header.font = { bold: true, size: 11 };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.eachCell((cell, col) => {
    const spec = col === 1 ? null : ROSTER_TEMPLATE_COLUMNS[col - 2];
    const required = spec?.required ?? false;
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: required ? FILL_REQUIRED : FILL_OPTIONAL },
    };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF9A9A9A' } } };
    if (spec) cell.note = spec.hint;
  });

  // Giữ số 0 đầu của SĐT và mã học sinh; ngày sinh hiện dạng ngày/tháng/năm.
  for (const key of ['studentCode', 'phone', 'parentPhone'] as const) {
    ws.getColumn(key).numFmt = TEXT_FORMAT;
  }
  ws.getColumn('dateOfBirth').numFmt = 'dd/mm/yyyy';

  const validations = (ws as unknown as WithDataValidations).dataValidations;
  const genderCol = ws.getColumn('gender').letter;
  validations.add(`${genderCol}2:${genderCol}${DATA_ROWS + 1}`, {
    type: 'list',
    allowBlank: true,
    formulae: [`"${GENDERS.map((g) => GENDER_LABELS[g]).join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Giới tính',
    error: 'Chọn Nam, Nữ hoặc Khác',
  });
  const dobCol = ws.getColumn('dateOfBirth').letter;
  validations.add(`${dobCol}2:${dobCol}${DATA_ROWS + 1}`, {
    type: 'date',
    operator: 'between',
    allowBlank: true,
    formulae: [new Date(Date.UTC(1990, 0, 1)), new Date(Date.UTC(2030, 0, 1))],
    showErrorMessage: true,
    errorTitle: 'Ngày sinh',
    error: 'Nhập ngày dạng ngày/tháng/năm, ví dụ 15/08/2008',
  });

  const guide = wb.addWorksheet('Hướng dẫn');
  guide.columns = [{ width: 20 }, { width: 12 }, { width: 62 }, { width: 24 }];
  const title = guide.addRow([`Mẫu danh sách học sinh – ${className}`]);
  title.font = { bold: true, size: 14 };
  guide.addRow([
    'Điền vào sheet "Danh sách", mỗi dòng một học sinh, giữ nguyên dòng tiêu đề. Chỉ cột có chữ (bắt buộc) là phải điền; cột (tùy chọn) để trống được.',
  ]);
  guide.addRow([
    'Nhập file này ở tab Danh sách của lớp, nút "Nhập từ Excel". Mỗi lần nhập sẽ thêm học sinh mới, không cập nhật học sinh đã có; tên trùng được thêm hậu tố (2), (3).',
  ]);
  guide.mergeCells('A2:D2');
  guide.mergeCells('A3:D3');
  for (const r of [2, 3]) {
    guide.getRow(r).alignment = { wrapText: true, vertical: 'top' };
    guide.getRow(r).height = 34;
  }
  guide.addRow([]);
  const head = guide.addRow(['Cột', 'Bắt buộc?', 'Cách điền', 'Ví dụ']);
  head.font = { bold: true };
  for (const c of ROSTER_TEMPLATE_COLUMNS) {
    const row = guide.addRow([c.label, c.required ? 'Bắt buộc' : 'Tùy chọn', c.hint, c.example]);
    row.alignment = { wrapText: true, vertical: 'top' };
    if (c.required) row.getCell(2).font = { bold: true, color: { argb: 'FFB45309' } };
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
