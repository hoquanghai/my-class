/**
 * Cột trong file Excel mẫu danh sách học sinh. API dùng để tạo file, parser dùng để
 * nhận diện tiêu đề, web dùng để giải thích cột nào bắt buộc/tùy chọn.
 */
export type RosterField =
  | 'name'
  | 'studentCode'
  | 'dateOfBirth'
  | 'gender'
  | 'phone'
  | 'email'
  | 'school'
  | 'parentName'
  | 'parentPhone'
  | 'note';

export interface RosterColumnSpec {
  key: RosterField;
  /** Nhãn cột không kèm "(bắt buộc)/(tùy chọn)". */
  label: string;
  required: boolean;
  /** Hướng dẫn điền, hiện trong sheet Hướng dẫn và ghi chú ô tiêu đề. */
  hint: string;
  example: string;
  /** Độ rộng cột Excel (ký tự). */
  width: number;
}

export const ROSTER_TEMPLATE_COLUMNS: readonly RosterColumnSpec[] = [
  {
    key: 'name',
    label: 'Họ và tên',
    required: true,
    hint: 'Tên đầy đủ có dấu. Tên trùng trong lớp sẽ được thêm hậu tố (2), (3).',
    example: 'Nguyễn Văn An',
    width: 28,
  },
  {
    key: 'studentCode',
    label: 'Mã học sinh',
    required: false,
    hint: 'Mã do trường hoặc trung tâm cấp, tối đa 50 ký tự.',
    example: 'HS001',
    width: 14,
  },
  {
    key: 'dateOfBirth',
    label: 'Ngày sinh',
    required: false,
    hint: 'Định dạng ngày/tháng/năm, ví dụ 15/08/2008.',
    example: '15/08/2008',
    width: 14,
  },
  {
    key: 'gender',
    label: 'Giới tính',
    required: false,
    hint: 'Nam, Nữ hoặc Khác.',
    example: 'Nam',
    width: 11,
  },
  {
    key: 'phone',
    label: 'SĐT học sinh',
    required: false,
    hint: 'Số điện thoại của học sinh, ví dụ 0912345678.',
    example: '0912345678',
    width: 16,
  },
  {
    key: 'email',
    label: 'Email học sinh',
    required: false,
    hint: 'Email của học sinh nếu có.',
    example: 'an.nguyen@example.com',
    width: 26,
  },
  {
    key: 'school',
    label: 'Trường đang học',
    required: false,
    hint: 'Trường học sinh đang theo học, ví dụ THPT Nguyễn Huệ.',
    example: 'THPT Nguyễn Huệ',
    width: 24,
  },
  {
    key: 'parentName',
    label: 'Tên phụ huynh',
    required: false,
    hint: 'Họ tên cha, mẹ hoặc người giám hộ.',
    example: 'Nguyễn Văn Bình',
    width: 22,
  },
  {
    key: 'parentPhone',
    label: 'SĐT phụ huynh',
    required: false,
    hint: 'Số điện thoại liên hệ phụ huynh.',
    example: '0987654321',
    width: 16,
  },
  {
    key: 'note',
    label: 'Ghi chú',
    required: false,
    hint: 'Ghi chú riêng của giáo viên, tối đa 500 ký tự.',
    example: 'Học tốt hình học',
    width: 30,
  },
];

/** Tiêu đề cột trong file mẫu: "Họ và tên (bắt buộc)", "Ngày sinh (tùy chọn)". */
export function rosterColumnHeader(column: RosterColumnSpec): string {
  return `${column.label} (${column.required ? 'bắt buộc' : 'tùy chọn'})`;
}
