# Lớp Học (lophoc) — Điểm danh & kiểm tra đầu giờ

Ứng dụng web miễn phí cho giáo viên (trung tâm gia sư): lớp & danh sách, điểm danh, ngân hàng câu hỏi (dán / Word / ảnh AI), kiểm tra đầu giờ, chế độ máy chiếu, báo cáo.

Tài liệu: `mvp-requirements-classroom-app.md` (yêu cầu), `docs/superpowers/specs/` (thiết kế), `docs/superpowers/plans/` (kế hoạch từng slice).

## Cấu trúc

- `apps/api` — NestJS 12 (ESM), Prisma 7, PostgreSQL, Redis, Socket.IO
- `apps/web` — Next.js 16, Tailwind 4, next-intl (vi), PWA
- `packages/shared` — kiểu dữ liệu, schema Zod, parser câu hỏi, chấm điểm, hợp đồng socket
- `infra` — Docker Compose, Caddy

## Chạy local

Yêu cầu: Node 24, pnpm 9 (`corepack enable`), Docker Desktop.

```bash
pnpm install
pnpm infra:up                      # postgres (cổng 5433), redis, minio, mailpit
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate                    # tạo bảng
pnpm db:seed                       # dữ liệu demo: demo@lophoc.app / demo1234
pnpm dev                           # api :4000, web :3000
```

- API health: http://localhost:4000/api/health
- Web: http://localhost:3000
- Mailpit (email dev): http://localhost:8025
- MinIO console: http://localhost:9001 (lophoc / lophoc123)

Postgres dev lắng nghe ở cổng **5433** trên máy host để tránh đụng bản Postgres khác đang dùng 5432.

## Kiểm thử

```bash
pnpm test                            # unit (shared + api)
pnpm test:e2e                        # e2e trên DB lophoc_test
pnpm lint && pnpm typecheck
```

Các lệnh trên đi qua Turbo nên tự sinh Prisma client trước. Nếu chạy script trực tiếp trong `apps/api` (ví dụ `pnpm --filter @lophoc/api test`), hãy chạy `pnpm --filter @lophoc/api db:generate` một lần trước.

## Biến môi trường

Xem `apps/api/.env.example` và `apps/web/.env.example`. `apps/api/.env.test` dùng cho e2e (không có secret).

| Biến (api)                                 | Ý nghĩa                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                               | Bí mật ký access token (≥ 32 ký tự). Production: `openssl rand -base64 48`                   |
| `STUDENT_APP_URL`                          | Sub-domain học sinh (dev `http://hs.localhost:3000`): CORS, Socket.IO, đường dẫn trong mã QR |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth; để trống thì nút "Tiếp tục với Google" bị ẩn                                   |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`   | Facebook Login (cần quyền `email`); để trống thì nút Facebook bị ẩn                          |
| `SMTP_HOST/PORT/USER/PASS/SECURE`          | Gửi email xác thực và đặt lại mật khẩu (dev: Mailpit `localhost:1025`)                       |
| `MAIL_FROM`                                | Địa chỉ người gửi                                                                            |
| `MAIL_TRANSPORT`                           | `smtp` (mặc định) hoặc `memory` (test: giữ email trong RAM)                                  |
| `APP_URL`, `API_URL`                       | Địa chỉ web và api, dùng cho cookie, CORS, liên kết trong email, OAuth                       |

## Xác thực

- Giáo viên: email + mật khẩu (argon2), Google hoặc Facebook. Access token JWT 15 phút trong cookie `lh_at`, refresh token 30 ngày (xoay vòng, hash trong DB) trong cookie `lh_rt` (path `/api/auth`), cookie gợi ý `lh_session` cho `proxy.ts` của web.
- Rate limit: 120 req/phút/IP toàn cục, 10 req/phút/IP cho các endpoint auth.
- Danh sách lớp: `GET /api/classes/:id/students/template.xlsx` tải file Excel mẫu (đủ cột, tiêu đề ghi rõ bắt buộc/tùy chọn, sheet hướng dẫn); `POST .../students/import-excel` đọc mọi cột nhận diện được (mã HS, ngày sinh, giới tính, SĐT, email, trường, phụ huynh, ghi chú), chỉ "Họ và tên" bắt buộc.
- Hồ sơ giáo viên: `GET/PATCH /api/teachers/me` (tên, điện thoại, trường, cấp dạy, môn), `POST /api/auth/password` (đổi/đặt mật khẩu; nằm dưới /auth để nhận cookie refresh và giữ phiên hiện tại, thu hồi phiên khác), `POST/DELETE /api/teachers/me/avatar` (ảnh ≤ 2 MB).
- Redirect Google OAuth: `API_URL/api/auth/google/callback` (khai báo trong Google Cloud Console). Redirect Facebook: `API_URL/api/auth/facebook/callback` (Facebook Developers → Facebook Login → Valid OAuth Redirect URIs; app cần quyền `email`).

## Docker

```bash
docker build -f apps/api/Dockerfile -t lophoc-api .
docker build -f apps/web/Dockerfile -t lophoc-web .
```

## Deploy

Sẽ bổ sung ở slice S8 (Docker Compose production + Caddy + backup + Cloudflare).
