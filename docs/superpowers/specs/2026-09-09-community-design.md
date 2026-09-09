# Cộng đồng chia sẻ bộ đề theo môn — thiết kế

**Trạng thái:** đã triển khai (API + web) ngày 2026-09-09, sau khi người dùng chốt "ok triển khai theo đề xuất".

Yêu cầu MVP (§9) từng xếp "kho câu hỏi chia sẻ/công khai" vào non-goal; mục này chủ động mở rộng phạm vi vì ngân hàng trống là rào cản lớn nhất với giáo viên mới.

## 1. Quyết định đã chốt

1. **Đơn vị chia sẻ là "bộ đề"** (`SharedSet`): chọn câu trong ngân hàng hoặc đăng nguyên một đề kiểm tra. Nội dung được **chụp lại** (`SharedSetQuestion.snapshot`, giống `QuizRunQuestion.snapshot`) nên sửa ngân hàng sau đó không đổi bài đã đăng; muốn cập nhật thì "Đăng bản mới" (`version` + 1), người đã lấy về bản cũ không bị ảnh hưởng.
2. **Chỉ giáo viên đã đăng nhập** mới xem/lấy về; không có trang công khai/SEO ở giai đoạn đầu để không lộ đáp án cho học sinh. Đăng bài, bình luận, báo cáo cần email đã xác minh (`EMAIL_NOT_VERIFIED`).
3. **Trạng thái bài đăng**: `draft` (chỉ mình thấy) · `published` (trong kho) · `unlisted` (chỉ ai có link) · `archived` (ẩn, người đã lấy vẫn giữ). Cờ `hiddenAt` do hệ thống đặt khi đủ số báo cáo (flag `community.report_auto_hide`, mặc định 3) hoặc quản trị ẩn bằng SQL; `featuredAt` (SQL) xếp bài lên đầu kho.
4. **Tương tác**: Thích (đếm, xếp hạng), bình luận phẳng có thể gắn "câu số N" (tác giả đánh dấu "Đã sửa", xóa được mọi bình luận; người viết xóa của mình), Báo cáo (một lần/giáo viên, lý do spam/bản quyền/sai đáp án/khác), Chia sẻ = sao chép link. Không có thông báo, trả lời lồng nhau, theo dõi tác giả.
5. **Lấy về** là hành động chính: mỗi câu thành câu hỏi mới của người lấy (`source = community`, `Question.sharedSetId` trỏ về bài gốc), tùy chọn tạo luôn đề. Gói miễn phí không giới hạn xem/lấy, chỉ chặn lạm dụng bằng trần theo ngày (`community.max_clones_per_day`, mặc định 20, lỗi `LIMIT_COMMUNITY_CLONES`).
6. **Cam kết khi đăng**: bắt buộc `agree: true` ("tôi có quyền chia sẻ và cho phép giáo viên khác dùng trong lớp"), ô "Nguồn" tùy chọn.
7. **Tín hiệu tin cậy**: tác giả + trường (từ hồ sơ), số câu, lượt thích/lấy/góp ý, và **mức dùng thật**: số lượt kiểm tra đã kết thúc, số câu trả lời, % đúng, gộp câu gốc của tác giả (`originQuestionId`) và câu người khác lấy về (`sharedSetId`).

## 2. Dữ liệu (Prisma)

`SharedSet` (tác giả, tiêu đề, mô tả, môn/khối theo danh mục, chủ đề, nguồn, trạng thái, `hiddenAt`, `featuredAt`, `version`, `questionCount`, `questionTypes[]`, `difficulties[]`, các bộ đếm like/clone/comment/report, `publishedAt`) · `SharedSetQuestion` (thứ tự, `originQuestionId` SetNull, `snapshot` JSON) · `SharedSetLike` (khóa `setId+teacherId`) · `SharedSetComment` (xóa mềm, `questionIndex`, `resolvedAt`) · `SharedSetReport` (unique theo giáo viên) · `SharedSetClone` (mỗi lượt lấy, chỉ mục `teacherId+createdAt` cho trần ngày). `Question.sharedSetId` (SetNull khi xóa bài). Migration `community_shared_sets`.

## 3. API (`/community`, module `community`)

`GET sets` (lọc môn/khối/chủ đề/loại câu/mức độ, tìm theo tiêu đề/chủ đề/tên tác giả, sắp xếp mới/thích/lấy, phân trang; chỉ `published` chưa ẩn, nổi bật lên đầu) · `GET mine` · `GET facets` (chủ đề trong kho) · `POST sets` (đăng) · `GET/PATCH/DELETE sets/:id` · `POST sets/:id/republish` · `POST sets/:id/clone` · `POST/DELETE sets/:id/like` · `GET/POST sets/:id/comments`, `DELETE comments/:id`, `POST comments/:id/resolve` · `POST sets/:id/report`. Tác giả luôn xem được bài của mình; người khác chỉ thấy `published`/`unlisted` chưa ẩn (404 nếu không). Schema zod trong `packages/shared/src/community/schemas.ts`, DTO trong `types.ts`. e2e: `apps/api/test/community.e2e-spec.ts`.

## 4. Web

Mục "Cộng đồng" trên thanh điều hướng → `/app/community`: tab Kho chung (tab theo môn, mặc định môn đầu trong hồ sơ; bộ lọc khối/chủ đề/loại/mức độ/tìm kiếm/sắp xếp; thẻ bài) và Bài của tôi (kèm trạng thái). Nút "Đăng bộ đề" mở `PublishSetDialog` (từ đề hoặc chọn câu trong ngân hàng, tự điền tiêu đề/môn/khối, chọn trạng thái, cam kết); trang đề kiểm tra có nút "Đăng lên cộng đồng" (`?publish=<quizId>`). Trang chi tiết `/app/community/[id]`: thông tin, thống kê tương tác và mức dùng, danh sách câu có đáp án + lời giải, nút Lấy về (hộp thoại, tùy chọn tạo đề, link mở ngân hàng/đề), Thích, Sao chép link, Báo cáo; tác giả có Sửa bài (kèm đổi trạng thái), Đăng bản mới (từ các câu gốc), Xóa bài; góp ý gắn câu qua "Góp ý câu này".

## 5. Việc để sau

Trang admin duyệt báo cáo (hiện dùng SQL), thông báo cho tác giả khi có góp ý, bộ nổi bật khởi đầu do chủ dự án đăng, thống kê nâng cao/nổi bật cho gói trả phí, trang công khai có SEO (nếu quyết định mở, phải ẩn đáp án).
