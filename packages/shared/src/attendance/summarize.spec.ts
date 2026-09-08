import { isAttended, nextAttendanceStatus, summarizeAttendance } from './summarize.js';

describe('summarizeAttendance', () => {
  it('đếm từng trạng thái và tổng', () => {
    expect(
      summarizeAttendance([
        { status: 'present' },
        { status: 'present' },
        { status: 'absent' },
        { status: 'late' },
        { status: 'excused' },
      ]),
    ).toEqual({ present: 2, absent: 1, late: 1, excused: 1, total: 5 });
  });

  it('danh sách rỗng → toàn 0', () => {
    expect(summarizeAttendance([])).toEqual({ present: 0, absent: 0, late: 0, excused: 0, total: 0 });
  });
});

describe('isAttended', () => {
  it('có mặt và muộn tính là đi học', () => {
    expect(isAttended('present')).toBe(true);
    expect(isAttended('late')).toBe(true);
    expect(isAttended('absent')).toBe(false);
    expect(isAttended('excused')).toBe(false);
  });
});

describe('nextAttendanceStatus', () => {
  it('xoay vòng có mặt → vắng → muộn → có phép → có mặt', () => {
    expect(nextAttendanceStatus('present')).toBe('absent');
    expect(nextAttendanceStatus('absent')).toBe('late');
    expect(nextAttendanceStatus('late')).toBe('excused');
    expect(nextAttendanceStatus('excused')).toBe('present');
  });
});
