import type { AttendanceStatus } from './schemas.js';
import type { AttendanceSummary } from './types.js';

export function summarizeAttendance(
  records: ReadonlyArray<{ status: AttendanceStatus }>,
): AttendanceSummary {
  const summary: AttendanceSummary = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
  for (const r of records) {
    summary[r.status] += 1;
    summary.total += 1;
  }
  return summary;
}

/** Muộn vẫn tính là có mặt khi tính tỷ lệ chuyên cần. */
export function isAttended(status: AttendanceStatus): boolean {
  return status === 'present' || status === 'late';
}

/** Trạng thái kế tiếp khi bấm vào ô học sinh. */
export function nextAttendanceStatus(status: AttendanceStatus): AttendanceStatus {
  switch (status) {
    case 'present':
      return 'absent';
    case 'absent':
      return 'late';
    case 'late':
      return 'excused';
    case 'excused':
      return 'present';
  }
}
