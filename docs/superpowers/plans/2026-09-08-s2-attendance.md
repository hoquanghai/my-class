# S2 — Buổi học + Điểm danh: Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Cùng agent thực thi ngay sau khi viết; boilerplate mô tả bằng hợp đồng, logic thuần và test viết đủ mã.

**Goal:** Giáo viên bắt đầu buổi học cho một lớp, điểm danh bằng ô bấm (Có mặt / Vắng / Muộn / Có phép, mặc định Có mặt), đánh dấu hàng loạt, hoàn tác, ghi chú từng học sinh; kết thúc buổi và gửi phản hồi 1 chạm; xem danh sách buổi học kèm tóm tắt và lịch sử điểm danh từng học sinh.

**Architecture:** Module `sessions` trong API (ClassSession + AttendanceRecord + SessionFeedback). Khi tạo buổi, tạo sẵn bản ghi `present` cho mọi học sinh đang có; học sinh thêm sau được bổ sung khi mở buổi. Cập nhật điểm danh là một endpoint upsert hàng loạt (dùng cho cả bấm đơn lẻ, hàng loạt và hoàn tác). Giới hạn lịch sử `free.history_days` áp ở danh sách buổi và lịch sử học sinh. Web: tab "Buổi học" trong lớp, trang `/app/sessions/[id]` mobile-first với lưới ô bấm.

**Tech Stack:** không thêm thư viện.

---

## Quyết định trong slice

| #   | Quyết định                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Mỗi lớp tối đa một buổi `active`. `POST /classes/:id/sessions` trả buổi đang mở nếu có (200), không thì tạo mới (201).                                       |
| 2   | Bấm vào ô học sinh xoay vòng trạng thái: Có mặt → Vắng → Muộn → Có phép → Có mặt. Nút ghi chú riêng mở hộp thoại nhập ghi chú.                               |
| 3   | Hoàn tác ở client: giữ ngăn xếp các thay đổi (giá trị trước), "Hoàn tác" gửi lại giá trị trước qua cùng endpoint upsert.                                     |
| 4   | Buổi đã kết thúc vẫn sửa được điểm danh (giáo viên sửa sai sót), không có "mở lại".                                                                          |
| 5   | Kết thúc buổi → hộp thoại phản hồi: 5 sao + góp ý, có thể bỏ qua. Lưu `SessionFeedback` (1 buổi 1 phản hồi, gửi lại thì ghi đè).                             |
| 6   | Lịch sử: danh sách buổi và lịch sử học sinh chỉ gồm buổi có `startedAt` trong `free.history_days` ngày gần nhất; trả thêm `hiddenCount` để UI hiện nút khóa. |
| 7   | Sự kiện: `session_started {classId, rosterSize}` khi tạo buổi mới.                                                                                           |

## Hợp đồng API (dưới `/api`, đều cần JWT)

| Method & path                                          | Body                                                   | Trả về                                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| POST `/classes/:classId/sessions`                      | –                                                      | 201/200 `SessionDetailDto`                                                                            |
| GET `/classes/:classId/sessions`                       | –                                                      | `{ sessions: SessionSummaryDto[], hiddenCount, historyDays }` mới nhất trước                          |
| GET `/sessions/:id`                                    | –                                                      | `SessionDetailDto { id, classId, className, status, startedAt, endedAt, note, records[], summary }`   |
| PATCH `/sessions/:id/attendance`                       | `{ updates: [{ studentId, status, note? }] }` (1..100) | `SessionDetailDto`; studentId không thuộc lớp → 400                                                   |
| POST `/sessions/:id/end`                               | –                                                      | `SessionDetailDto` (idempotent)                                                                       |
| POST `/sessions/:id/feedback`                          | `{ rating 1..5, comment? ≤ 500 }`                      | 204                                                                                                   |
| GET `/classes/:classId/students/:studentId/attendance` | –                                                      | `{ student, items: [{ sessionId, startedAt, status, note }], rate: { present, total }, hiddenCount }` |

`AttendanceRecordDto = { studentId, name, status, note }`, `AttendanceSummary = { present, absent, late, excused, total }`, `SessionSummaryDto = { id, status, startedAt, endedAt, summary, hasFeedback }`.

## Task

1. **Shared**: `attendance/schemas.ts` (enum trạng thái, `updateAttendanceSchema`, `sessionFeedbackSchema`), `attendance/types.ts`, `attendance/summarize.ts` + spec (đếm theo trạng thái, tỷ lệ có mặt tính cả muộn là có mặt).
2. **API** `modules/sessions`: service (start, list, detail với backfill, updateAttendance, end, feedback, studentHistory), controller, module; e2e `sessions.e2e-spec.ts`: tạo buổi → 201 với N bản ghi present; tạo lại → 200 cùng id; PATCH đơn + hàng loạt + ghi chú; studentId lạ → 400; end → status ended, endedAt; end lần 2 → 200; feedback → 204 rồi ghi đè; list có summary + hasFeedback; buổi 40 ngày trước (chèn thẳng DB) bị ẩn với hiddenCount=1; lịch sử học sinh đúng rate; lớp của người khác → 404; học sinh thêm sau khi mở buổi được backfill present khi GET.
3. **Web**: `lib/sessions.ts` hooks; tab Buổi học (nút bắt đầu/tiếp tục, danh sách, chú thích bị ẩn); trang `/app/sessions/[id]` (lưới ô bấm, thanh tóm tắt, hàng loạt, hoàn tác, ghi chú, kết thúc + phản hồi); hộp thoại lịch sử điểm danh từ roster; messages `Sessions`, `Attendance`.
4. Kiểm thử trình duyệt: bắt đầu buổi → bấm đổi trạng thái → hàng loạt → hoàn tác → ghi chú → kết thúc → phản hồi → danh sách buổi → lịch sử học sinh. Pipeline + e2e xanh, commit.
