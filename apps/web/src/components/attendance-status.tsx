import type { AttendanceStatus } from '@lophoc/shared';

/** Màu theo trạng thái điểm danh, dùng chung cho ô bấm, chip tóm tắt và lịch sử. */
export const STATUS_STYLES: Record<AttendanceStatus, { tile: string; chip: string; dot: string }> =
  {
    present: {
      tile: 'border-green-300 bg-green-50 text-green-900 hover:bg-green-100',
      chip: 'bg-green-100 text-green-800',
      dot: 'bg-green-500',
    },
    absent: {
      tile: 'border-red-300 bg-red-50 text-red-900 hover:bg-red-100',
      chip: 'bg-red-100 text-red-800',
      dot: 'bg-red-500',
    },
    late: {
      tile: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
      chip: 'bg-amber-100 text-amber-800',
      dot: 'bg-amber-500',
    },
    excused: {
      tile: 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100',
      chip: 'bg-blue-100 text-blue-800',
      dot: 'bg-blue-500',
    },
  };

export const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];
