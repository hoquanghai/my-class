# S3 — Ngân hàng câu hỏi: Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Cùng agent thực thi ngay sau khi viết. Chia ba phần: **S3a** dán/Word + lưới preview-and-fix + bank; **S3b** soạn tay keyboard-first + dán ảnh; **S3c** AI ảnh/PDF qua job nền + quota.

**Goal:** Giáo viên nhập câu hỏi nhanh từ văn bản dán, file Word (kể cả ảnh và đáp án in đậm), ảnh chụp/PDF (AI), hoặc soạn tay; mọi đường đều đi qua lưới xem trước có thể sửa rồi "Lưu tất cả" vào ngân hàng riêng của giáo viên với thẻ môn/khối/chủ đề/mức độ; ngân hàng có lọc, tìm, sửa, xóa.

**Architecture:** Parser thuần TypeScript trong `packages/shared/src/questions/parser` nhận `ParserLine[]` (text + cờ đậm/gạch chân + ảnh) để dùng chung cho dán (client, tức thì) và Word (server: mammoth → HTML → dòng có `**đậm**`). Ảnh lưu object storage (MinIO dev / R2 prod) qua `StorageService`, endpoint `POST /media/upload`. Câu hỏi lưu Markdown + LaTeX `$…$`; web render bằng react-markdown + remark-math + rehype-katex.

**Tech Stack:** api: `mammoth`, `node-html-parser`, `@aws-sdk/client-s3`; web: `react-markdown`, `remark-math`, `rehype-katex`, `remark-gfm`, `katex`.

---

## Quyết định trong slice

| #   | Quyết định                                                                                                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Parser nhận dạng câu bằng `Câu n`, `Bài n`, `Question n`, `n.`, `n)`; phương án `A.`/`A)`/`a.` cùng dòng hoặc nhiều dòng (tách cùng dòng chỉ khi nhãn liên tiếp A→B→C); đáp án đúng từ bảng đáp án cuối đề (`1B 2C`, `1-B`, `Câu 1: B`, bảng hai dòng số/chữ), dòng `Đáp án: B` trong câu, dấu `*` trước nhãn, hoặc nhãn/phương án in đậm/gạch chân (`**A.**`). |
| 2   | Loại câu suy ra: không có phương án → trả lời ngắn; đúng 2 phương án "Đúng/Sai" → đúng-sai; >1 đáp án đúng → nhiều lựa chọn; còn lại → một lựa chọn.                                                                                                                                                                                                            |
| 3   | Dòng nhiễu bị bỏ: "Họ và tên", "Mã đề", "Trang n", "SỞ GD&ĐT", "ĐỀ KIỂM TRA/THI", "Thời gian làm bài", "Điểm", "Lớp:", dòng gạch `-----`, dòng chỉ có số trang.                                                                                                                                                                                                 |
| 4   | Lưới preview: hàng có `issues` (thiếu phương án, thiếu đáp án, thiếu đề) tô đỏ; "Lưu tất cả" chỉ lưu hàng hợp lệ và báo số hàng còn lỗi; thẻ (môn/khối/chủ đề/mức độ) áp cho cả đợt, sửa riêng từng hàng được sau khi lưu.                                                                                                                                      |
| 5   | Ảnh: `POST /media/upload` (png/jpg/webp/gif ≤ 5 MB) trả `{ key, url }`; Markdown ảnh `![](url)`. Ảnh trong Word gắn vào câu gần nhất (đề hoặc phương án đang mở).                                                                                                                                                                                               |
| 6   | Ngân hàng phân trang 20/trang, lọc theo môn/khối/chủ đề/mức độ/loại, tìm theo nội dung (ILIKE trên stem). Facets = giá trị distinct của giáo viên.                                                                                                                                                                                                              |
| 7   | Sự kiện `question_import {source, count}` khi lưu đợt.                                                                                                                                                                                                                                                                                                          |

## Hợp đồng API (dưới `/api`, cần JWT)

| Method & path                 | Body                                                                                | Trả về                                             |
| ----------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| GET `/questions`              | query `QuestionFilter` (subject, grade, topic, difficulty, type, q, page, pageSize) | `QuestionListDto { items, total, page, pageSize }` |
| GET `/questions/facets`       | –                                                                                   | `QuestionFacetsDto { subjects, grades, topics }`   |
| GET `/questions/:id`          | –                                                                                   | `QuestionDto`                                      |
| POST `/questions`             | `QuestionInput`                                                                     | 201 `QuestionDto`                                  |
| POST `/questions/bulk`        | `{ questions: QuestionInput[], source }`                                            | 201 `{ created: number, ids }`                     |
| PATCH `/questions/:id`        | `UpdateQuestionInput`                                                               | `QuestionDto`                                      |
| DELETE `/questions/:id`       | –                                                                                   | 204 (xóa mềm)                                      |
| POST `/questions/import/docx` | multipart `file` (.docx ≤ 10 MB)                                                    | `ParseResult` (ảnh đã tải lên)                     |
| POST `/media/upload`          | multipart `file` (ảnh ≤ 5 MB)                                                       | 201 `{ key, url }`                                 |

## Task S3a

1. Shared: `questions/schemas.ts`, `questions/types.ts`, `questions/parser/*` + spec (≥ 12 mẫu đề).
2. API: `storage` module (S3 client, MinIO dev), `media` controller, `questions` module (service/controller, docx import service), e2e `questions.e2e-spec.ts` (CRUD + lọc + bulk + docx tạo bằng `docx` lib? → dùng file .docx mẫu tạo bằng JSZip tối giản).
3. Web: `MarkdownLatex`, trang `/app/questions` (lọc, tìm, thẻ, xóa, sửa), `/app/questions/import` (tab Dán / Word / Ảnh-PDF (khóa) / Soạn tay (S3b)), lưới preview-and-fix.
4. Kiểm thử trình duyệt: dán đề 5 câu có bảng đáp án → lưới → sửa → lưu → thấy trong ngân hàng với LaTeX render.
