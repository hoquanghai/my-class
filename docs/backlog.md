# Việc để sau (backlog)

Những ý đã bàn với chủ dự án nhưng chốt là **chưa làm**. Mỗi mục ghi ngày bàn và lý do hoãn để sau này quyết định nhanh.

## Email hệ thống (đề xuất 2026-09-11, chủ dự án: "ghi vào future, hiện tại chưa cần")

Đã có: xác minh email khi đăng ký, gửi lại xác minh, đặt lại mật khẩu, yêu cầu thanh toán gửi admin (kèm link duyệt), báo kích hoạt / từ chối gói. Gửi qua Resend (`MAIL_TRANSPORT=resend`); tên miền gửi chưa xác thực nên tạm dùng `onboarding@resend.dev`.

| #   | Email                 | Khi nào gửi                                              | Ghi chú                                                                                                                       |
| --- | --------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sắp hết hạn gói       | Trước 7 ngày và đúng ngày hết hạn                        | Kèm mã QR gia hạn đúng gói. Quan trọng nhất cho doanh thu. Cần job chạy hằng ngày (BullMQ repeatable) và cột ghi nhớ đã nhắc. |
| 2   | Chào mừng sau đăng ký | Ngay sau khi tạo tài khoản                               | 3 bước bắt đầu: tạo lớp, nhập đề, phát bài kiểm tra; link tài liệu.                                                           |
| 3   | Tổng kết sau buổi học | Khi giáo viên kết thúc buổi                              | Số có mặt, điểm trung bình, câu sai nhiều nhất. Làm sau khi có báo cáo (S6).                                                  |
| 4   | Bảo mật               | Khi đổi mật khẩu; khi đăng nhập từ thiết bị mới          | Nhỏ, tăng độ tin cậy. Đăng nhập thiết bị mới cần lưu dấu thiết bị theo refresh token.                                         |
| 5   | Cộng đồng             | Có góp ý mới trên bộ đề của mình; bộ đề bị ẩn do báo cáo | Gộp theo ngày để không dội email.                                                                                             |
| 6   | Nhắc quay lại         | 14 ngày không đăng nhập                                  | Chỉ làm sau khi có nút hủy nhận thư và trang tùy chọn email.                                                                  |
| 7   | Nhắc xác minh email   | 3 ngày sau đăng ký mà chưa xác minh                      | Để dùng được cộng đồng (đăng bài, góp ý, báo cáo).                                                                            |

Thứ tự khuyên dùng khi làm: 1, 2, 4 trước; 3 và 5 khi báo cáo và cộng đồng đã đông; 6 và 7 sau khi có hủy đăng ký nhận thư. Mọi mẫu email dùng chung một bố cục (tiêu đề, nội dung, nút hành động, chân thư) để đồng bộ.

## Việc khác đã hoãn

- Áp giới hạn theo gói Gold / Platinum (số lớp, học sinh, trang AI, lịch sử, xuất file): hiện mọi tài khoản vẫn theo giới hạn miễn phí, gói và hạn chỉ được ghi nhận (2026-09-11).
- Cổng thanh toán tự động (VNPay / Momo) thay cho chuyển khoản QR + duyệt tay: cân nhắc khi vượt khoảng 50 khách trả phí (2026-09-11).
- Trang quản trị duyệt báo cáo cộng đồng và kích hoạt gói (hiện duyệt qua link trong email, ẩn bài bằng SQL) (2026-09-09).
- Thông báo cho tác giả khi có góp ý; bộ đề nổi bật khởi đầu do chủ dự án đăng; trang công khai có SEO cho cộng đồng (phải ẩn đáp án) (2026-09-09).
- Máy chiếu `/present/[sessionId]` (S5), báo cáo (S6), triển khai và kiểm tra tải (S8) theo thứ tự lát cắt trong `docs/superpowers/specs/2026-09-08-classroom-app-design.md`.
- Đọc file Word có công thức MathType ("tầng 0": LibreOffice → OMML → pandoc) và bộ đọc văn bản cho định dạng đề thi 2025 (2026-09-09).
- Chọn logo (5 phương án trong `docs/brand/logo-options.html`) rồi xuất favicon / PWA / OG.
