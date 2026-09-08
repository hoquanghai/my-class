# S1 — Auth + Lớp + Roster: Kế hoạch triển khai

> **Trạng thái: HOÀN THÀNH 2026-09-08.** Task 1–8 đã thực hiện; API e2e 26 test + unit 17 test xanh; kiểm thử trình duyệt: đăng ký → tạo lớp → dán tên trùng (hậu tố) → nhập Excel → QR → khóa danh sách → tạo mã mới → đăng xuất/đăng nhập. Chưa làm: Google OAuth chạy thật (chưa có client id), Playwright tự động (để S2).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> Ghi chú thực thi: slice này được cùng một agent thực thi ngay sau khi viết kế hoạch, nên các file boilerplate (module NestJS, trang Next.js) được mô tả bằng hợp đồng + chữ ký thay vì chép toàn bộ mã; mã đầy đủ được đưa vào cho phần thuần logic (dedupe tên, parser Excel, token, chấm giới hạn) và cho mọi test.

**Goal:** Giáo viên đăng ký/đăng nhập (email + mật khẩu, Google), xác thực email, đặt lại mật khẩu; tạo tối đa 2 lớp (free), nhập danh sách học sinh bằng dán tên hoặc Excel (tối đa 50/lớp), sửa/xóa/sắp xếp, tự thêm hậu tố khi trùng tên; mã lớp 6 ký tự + QR tải được; khóa roster.

**Architecture:** API NestJS: JWT access (15 phút) + refresh token xoay vòng (30 ngày, hash trong DB) đều trong cookie httpOnly; guard toàn cục + `@Public()`. Google OAuth tự triển khai bằng `fetch` (không Passport). Mailer nodemailer (Mailpit dev; transport `memory` khi test). Feature flag + giới hạn free đọc từ bảng `FeatureFlag` có cache 60 giây. Web Next.js: `proxy.ts` chặn `/app/*` khi thiếu cookie, React Query + `apiFetch` tự refresh khi 401.

**Tech Stack:** thêm `@nestjs/jwt`, `@nestjs/throttler`, `cookie-parser`, `nodemailer`, `exceljs`, `qrcode`, `multer` (qua `@nestjs/platform-express`), web: `@tanstack/react-query`, `lucide-react`.

---

## Quyết định trong slice

| #   | Quyết định                                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Xác thực email không chặn đăng nhập; banner nhắc + nút gửi lại. Token xác thực 24 giờ, reset 1 giờ; lưu SHA-256 của token.                                                                                                                                                                                                                       |
| 2   | Cookie: `lh_at` (access, path `/`), `lh_rt` (refresh, path `/api/auth`), `SameSite=Lax`, `Secure` khi production. Dev: web `localhost:3000` gọi api `localhost:4000` với `credentials: 'include'`, cùng site `localhost` nên cookie hoạt động.                                                                                                   |
| 3   | Google OAuth: `GET /api/auth/google` → redirect (state trong cookie `lh_oauth_state`, 10 phút) → `GET /api/auth/google/callback` → đổi code lấy token, lấy `userinfo`, chỉ chấp nhận `email_verified=true`, liên kết theo email. Thiếu env Google → `GET /api/auth/providers` trả `google:false`, web ẩn nút. Facebook: chỉ có `facebook:false`. |
| 4   | Xóa lớp: `DELETE /classes/:id` = xóa mềm (còn khôi phục), `DELETE /classes/:id/permanent` = xóa cứng cascade. Danh sách lớp không hiện lớp đã xóa mềm; giới hạn 2 lớp đếm lớp chưa xóa.                                                                                                                                                          |
| 5   | Nhập Excel: sheet đầu; tìm dòng tiêu đề trong 5 dòng đầu có ô khớp `họ và tên \| họ tên \| tên \| name` (không phân biệt dấu, hoa thường); cột điện thoại khớp `sđt \| điện thoại \| phone \| phụ huynh`; không có tiêu đề thì cột A = tên.                                                                                                      |
| 6   | Trùng tên: giữ tên đầu, các tên sau thành `Tên (2)`, `Tên (3)`… tính cả tên đã có trong lớp (chưa xóa).                                                                                                                                                                                                                                          |
| 7   | Sắp xếp roster: nút lên/xuống + "Sắp xếp A→Z" (không kéo thả) trong MVP.                                                                                                                                                                                                                                                                         |
| 8   | Rate limit: toàn cục 120 req/phút/IP, nhóm auth 10 req/phút/IP, bộ nhớ trong (chuyển Redis ở S8).                                                                                                                                                                                                                                                |
| 9   | Lỗi API thống nhất `{ statusCode, code?, message }`; giới hạn free trả 403 với `code: 'LIMIT_CLASSES' \| 'LIMIT_STUDENTS'`.                                                                                                                                                                                                                      |

## Cấu trúc file

```
packages/shared/src/
  index.ts (thêm export)
  auth/schemas.ts            zod: signup, login, forgot, reset, verify
  classes/schemas.ts         zod: createClass, updateClass, importNames, updateStudent, reorder
  classes/types.ts           TeacherDto, ClassSummaryDto, ClassDetailDto, StudentDto, LimitsDto
  roster/dedupe-names.ts     dedupeNames(existing, incoming)  (+ .spec.ts)
  roster/parse-names.ts      parseNameLines(text)             (+ .spec.ts)
apps/api/src/
  config/env.ts              thêm JWT_SECRET, GOOGLE_*, SMTP_*, MAIL_FROM, MAIL_TRANSPORT
  common/http-exception.filter.ts   chuẩn hóa lỗi
  common/decorators/public.decorator.ts, current-teacher.decorator.ts
  modules/feature-flags/{feature-flags.module.ts, feature-flags.service.ts, limits.service.ts}
  modules/mailer/{mailer.module.ts, mailer.service.ts, templates.ts}
  modules/analytics/{analytics.module.ts, analytics.service.ts}
  modules/auth/{auth.module.ts, auth.controller.ts, auth.service.ts, jwt-auth.guard.ts,
                tokens.ts (+spec), cookies.ts, google-oauth.service.ts}
  modules/teachers/{teachers.module.ts, teachers.controller.ts, teachers.service.ts}
  modules/classes/{classes.module.ts, classes.controller.ts, classes.service.ts,
                   students.controller.ts, students.service.ts,
                   excel-roster.parser.ts (+spec), qr.service.ts}
  app.module.ts              đăng ký module, ThrottlerModule, APP_GUARD, APP_FILTER
  main.ts                    cookie-parser
apps/api/test/
  helpers.ts                 createTestApp(), signupAndLogin(), cookie helpers
  auth.e2e-spec.ts, classes.e2e-spec.ts, roster.e2e-spec.ts
apps/web/src/
  proxy.ts
  lib/api.ts                 apiFetch + ApiError + refresh-once
  lib/query.tsx              QueryProvider
  lib/auth.ts                useMe(), useLogout()
  components/ui/{button.tsx, input.tsx, field.tsx, dialog.tsx, tabs.tsx, alert.tsx}
  app/(auth)/{login,signup,verify-email,forgot-password,reset-password}/page.tsx
  app/(auth)/layout.tsx
  app/app/layout.tsx         shell giáo viên + banner xác thực
  app/app/classes/page.tsx
  app/app/classes/[id]/page.tsx + components: roster-tab.tsx, settings-tab.tsx
  messages/vi.json           thêm khóa Auth, Classes, Roster, Common
```

## Hợp đồng API (tất cả dưới `/api`)

| Method & path                               | Auth           | Body (zod ở shared)                                               | Trả về                                                                                        |
| ------------------------------------------- | -------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| POST `/auth/signup`                         | public         | `SignupInput {name, email, password≥8, acceptTerms:true}`         | 201 `{teacher}` + cookie; gửi mail xác thực; event `signup`                                   |
| POST `/auth/login`                          | public         | `LoginInput {email, password}`                                    | 200 `{teacher}` + cookie; sai → 401                                                           |
| POST `/auth/logout`                         | cookie         | –                                                                 | 204, thu hồi refresh, xóa cookie                                                              |
| POST `/auth/refresh`                        | cookie `lh_rt` | –                                                                 | 200 `{teacher}` + cookie mới; token cũ/thu hồi → 401                                          |
| GET `/auth/me`                              | jwt            | –                                                                 | `{teacher}`                                                                                   |
| POST `/auth/verify-email`                   | public         | `{token}`                                                         | 200 `{verified:true}`; token sai/hết hạn → 400                                                |
| POST `/auth/resend-verification`            | jwt            | –                                                                 | 204                                                                                           |
| POST `/auth/forgot-password`                | public         | `{email}`                                                         | luôn 204                                                                                      |
| POST `/auth/reset-password`                 | public         | `{token, password}`                                               | 200; thu hồi mọi refresh token                                                                |
| GET `/auth/providers`                       | public         | –                                                                 | `{google:boolean, facebook:false}`                                                            |
| GET `/auth/google`, `/auth/google/callback` | public         | –                                                                 | redirect                                                                                      |
| PATCH `/teachers/me`                        | jwt            | `{name}`                                                          | `{teacher}`                                                                                   |
| GET `/limits`                               | jwt            | –                                                                 | `LimitsDto {maxClasses, maxStudentsPerClass, aiPagesPerMonth, historyDays, exportEnabled}`    |
| GET `/classes`                              | jwt            | –                                                                 | `ClassSummaryDto[]` (kèm `studentCount`)                                                      |
| POST `/classes`                             | jwt            | `CreateClassInput`                                                | 201 `ClassDetailDto`; vượt giới hạn → 403 `LIMIT_CLASSES`; event `class_created`              |
| GET `/classes/:id`                          | jwt            | –                                                                 | `ClassDetailDto {…, students: StudentDto[]}`                                                  |
| PATCH `/classes/:id`                        | jwt            | `UpdateClassInput` (name, subject, grade, schedule, rosterLocked) | `ClassDetailDto`                                                                              |
| DELETE `/classes/:id`                       | jwt            | –                                                                 | 204 (xóa mềm)                                                                                 |
| DELETE `/classes/:id/permanent`             | jwt            | –                                                                 | 204 (xóa cứng cascade)                                                                        |
| POST `/classes/:id/regenerate-code`         | jwt            | –                                                                 | `{code}`                                                                                      |
| GET `/classes/:id/qr.png`                   | jwt            | –                                                                 | image/png, mã hóa `${APP_URL}/join/${code}`                                                   |
| POST `/classes/:id/students/import`         | jwt            | `ImportNamesInput {names: string[]}`                              | `{students: StudentDto[], added:number}`; vượt 50 → 403 `LIMIT_STUDENTS`; event `roster_size` |
| POST `/classes/:id/students/import-excel`   | jwt            | multipart `file` (.xlsx ≤ 2 MB)                                   | như trên; file hỏng/không có tên → 400                                                        |
| PATCH `/classes/:id/students/:sid`          | jwt            | `UpdateStudentInput {name?, parentPhone?, studentCode?}`          | `StudentDto`                                                                                  |
| DELETE `/classes/:id/students/:sid`         | jwt            | –                                                                 | 204 (xóa mềm)                                                                                 |
| POST `/classes/:id/students/reorder`        | jwt            | `{ids: string[]}`                                                 | `StudentDto[]`                                                                                |

`TeacherDto = { id, email, name, avatarUrl, emailVerified: boolean, plan }`.
`StudentDto = { id, name, studentCode, parentPhone, sortOrder }`.
`ClassSummaryDto = { id, name, subject, grade, code, rosterLocked, studentCount, createdAt }`.
`ClassDetailDto = ClassSummaryDto & { schedule, requireStudentCode, students }`.

Mọi route thuộc giáo viên khác → 404 (không lộ tồn tại).

---

### Task 1: Shared — schemas, types, dedupe/parse tên (TDD)

- [ ] Viết `roster/dedupe-names.spec.ts`:

```ts
import { dedupeNames } from './dedupe-names.js';

describe('dedupeNames', () => {
  it('giữ nguyên khi không trùng', () => {
    expect(dedupeNames([], ['An', 'Bình'])).toEqual(['An', 'Bình']);
  });
  it('thêm hậu tố (2), (3) cho tên trùng trong cùng đợt nhập', () => {
    expect(dedupeNames([], ['Nam', 'Nam', 'Nam'])).toEqual(['Nam', 'Nam (2)', 'Nam (3)']);
  });
  it('tính cả tên đã có trong lớp', () => {
    expect(dedupeNames(['Nam', 'Nam (2)'], ['Nam'])).toEqual(['Nam (3)']);
  });
  it('so sánh không phân biệt hoa thường và khoảng trắng thừa', () => {
    expect(dedupeNames(['Lê An'], ['lê  an'])).toEqual(['lê  an (2)']);
  });
});
```

- [ ] Viết `roster/dedupe-names.ts`:

```ts
const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Trả về danh sách tên mới đã thêm hậu tố " (n)" để không trùng với `existing` và với nhau. */
export function dedupeNames(existing: string[], incoming: string[]): string[] {
  const taken = new Set(existing.map(normalize));
  const result: string[] = [];
  for (const raw of incoming) {
    const base = raw.trim();
    let candidate = base;
    let n = 2;
    while (taken.has(normalize(candidate))) {
      candidate = `${base} (${n})`;
      n += 1;
    }
    taken.add(normalize(candidate));
    result.push(candidate);
  }
  return result;
}
```

- [ ] Viết `roster/parse-names.spec.ts`:

```ts
import { parseNameLines } from './parse-names.js';

describe('parseNameLines', () => {
  it('tách theo dòng, bỏ dòng trống, gộp khoảng trắng', () => {
    expect(parseNameLines('Nguyễn  Văn An\n\n  Trần Thị Bình \r\n')).toEqual([
      'Nguyễn Văn An',
      'Trần Thị Bình',
    ]);
  });
  it('bỏ số thứ tự đầu dòng dạng "1." "1)" "1-"', () => {
    expect(parseNameLines('1. An\n2) Bình\n3 - Châu\n4\tDũng')).toEqual([
      'An',
      'Bình',
      'Châu',
      'Dũng',
    ]);
  });
  it('giới hạn 200 ký tự mỗi tên', () => {
    expect(parseNameLines('a'.repeat(300))[0]).toHaveLength(200);
  });
});
```

- [ ] Viết `roster/parse-names.ts`:

```ts
const LEADING_INDEX = /^\s*\d{1,3}\s*[.)\-:–]?\s+/;

export function parseNameLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(LEADING_INDEX, '').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .map((line) => line.slice(0, 200));
}
```

- [ ] `auth/schemas.ts` (zod 4): `signupSchema {name: string 1..100, email: z.email() lowercased trimmed, password: 8..128, acceptTerms: z.literal(true)}`, `loginSchema`, `forgotPasswordSchema {email}`, `resetPasswordSchema {token: string, password}`, `verifyEmailSchema {token}`, `updateProfileSchema {name}`. Export kiểu `z.infer`.
- [ ] `classes/schemas.ts`: `scheduleItemSchema {weekday 1..7, start 'HH:MM', end 'HH:MM'}`, `createClassSchema {name 1..100, subject?, grade?, schedule?: item[]}`, `updateClassSchema = createClassSchema.partial().extend({ rosterLocked?: boolean })`, `importNamesSchema {names: string[] 1..200, mỗi tên 1..200}`, `updateStudentSchema {name?, parentPhone? (rỗng → null), studentCode?}`, `reorderSchema {ids: string[]}`.
- [ ] `classes/types.ts`: các DTO như bảng hợp đồng; `LimitsDto`.
- [ ] Cập nhật `index.ts`; chạy `pnpm --filter @lophoc/shared test` → 7 test mới xanh; build; commit `feat(shared): auth/class schemas, roster utils`.

### Task 2: API nền tảng — env, lỗi chuẩn, feature flags/limits, mailer, analytics

- [ ] `env.ts` thêm: `JWT_SECRET: z.string().min(32)`, `GOOGLE_CLIENT_ID?`, `GOOGLE_CLIENT_SECRET?`, `SMTP_HOST default 'localhost'`, `SMTP_PORT default 1025`, `SMTP_USER?`, `SMTP_PASS?`, `SMTP_SECURE default false`, `MAIL_FROM default 'Lớp Học <no-reply@lophoc.app>'`, `MAIL_TRANSPORT: z.enum(['smtp','memory']).default('smtp')`. Cập nhật `.env.example` (JWT_SECRET dev 64 ký tự), `.env.test` (`MAIL_TRANSPORT=memory`, JWT_SECRET test).
- [ ] `common/http-exception.filter.ts`: `@Catch()` → HttpException giữ status + `code` (nếu response có), lỗi khác → 500 `{statusCode:500, message:'Lỗi hệ thống'}` và log. Zod lỗi từ pipe (BadRequest với message mảng) → gộp thành chuỗi `; `.
- [ ] `feature-flags.service.ts`: `get<T>(key, fallback: T): Promise<T>` đọc `FeatureFlag`, cache Map + TTL 60 giây; `limits.service.ts`: `getLimits(): LimitsDto`, `assertCanCreateClass(teacherId)` (đếm class `deletedAt null`), `assertRosterCapacity(classId, adding)` (đếm student `deletedAt null`), ném `ForbiddenException({ code, message })`.
- [ ] Unit test `limits.service.spec.ts` với prisma mock: vượt 2 lớp → ném `LIMIT_CLASSES`; 48 + 3 học sinh → `LIMIT_STUDENTS`; 48 + 2 → không ném.
- [ ] `mailer.service.ts`: `send({to, subject, html, text})`; transport smtp (nodemailer) hoặc memory (`outbox: SentMail[]`); `templates.ts`: `verifyEmailTemplate(name, link)`, `resetPasswordTemplate(name, link)` tiếng Việt.
- [ ] `analytics.service.ts`: `track(name, props, teacherId?)` ghi `AnalyticsEvent`, nuốt lỗi (không làm hỏng request).
- [ ] Commit `feat(api): env, error filter, feature flags/limits, mailer, analytics`.

### Task 3: API auth (email + mật khẩu, refresh, verify, reset, Google)

- [ ] `tokens.ts`: `randomToken(bytes=32): string` (base64url), `sha256(s): string`, `hashPassword(pw)`, `verifyPassword(hash, pw)` (@node-rs/argon2). Spec: sha256 ổn định, randomToken 43 ký tự, verifyPassword đúng/sai.
- [ ] `cookies.ts`: `ACCESS_COOKIE='lh_at'`, `REFRESH_COOKIE='lh_rt'`, `setAuthCookies(res, {accessToken, refreshToken}, secure)`, `clearAuthCookies(res)`; refresh cookie `path: '/api/auth'`, maxAge 30 ngày; access maxAge 15 phút.
- [ ] `auth.service.ts`: `signup(input, meta)`, `login(input, meta)`, `refresh(rawRefresh, meta)` (xoay vòng: tìm hash, kiểm tra `revokedAt`/`expiresAt`, tạo token mới, revoke cũ), `logout(rawRefresh)`, `issueTokens(teacher, userAgent)` (JWT `{sub, email}` 15m + refresh DB), `verifyEmail(token)`, `resendVerification(teacherId)`, `forgotPassword(email)`, `resetPassword(token, password)` (revoke mọi refresh), `toTeacherDto(teacher)`. Email token: lưu `EmailToken {type, tokenHash, expiresAt}`; khi dùng đặt `usedAt`. Đăng nhập sai → 401 `Email hoặc mật khẩu không đúng`. Signup trùng email → 409 `EMAIL_TAKEN`.
- [ ] `jwt-auth.guard.ts`: đọc `lh_at` cookie hoặc `Authorization: Bearer`; `@Public()` bypass; gán `req.teacher = {id, email}`; đăng ký `APP_GUARD`. `current-teacher.decorator.ts`.
- [ ] `google-oauth.service.ts`: `isConfigured()`, `authorizeUrl(state)` (scope `openid email profile`, `prompt=select_account`), `exchangeCode(code): Promise<{email, emailVerified, name, picture, sub}>` (POST `https://oauth2.googleapis.com/token`, GET `https://openidconnect.googleapis.com/v1/userinfo`), `auth.service.loginWithGoogle(profile)`: tìm `AuthIdentity(google, sub)` → teacher; không có → tìm teacher theo email (đã verified) → tạo identity; không có → tạo teacher mới (`emailVerifiedAt = now`, `acceptedTermsAt = now`, event `signup {provider:'google'}`).
- [ ] `auth.controller.ts` theo bảng hợp đồng; `@Throttle({ default: { limit: 10, ttl: 60000 } })` cho signup/login/forgot/reset/resend.
- [ ] `main.ts`: `app.use(cookieParser())`; `app.module.ts`: `ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])`, `APP_GUARD: ThrottlerGuard` + `JwtAuthGuard`, `APP_FILTER`.
- [ ] e2e `auth.e2e-spec.ts` (DB test, mail memory):
  1. signup → 201, có 2 cookie, `teacher.emailVerified=false`; outbox có 1 mail chứa link `verify-email?token=`.
  2. signup trùng → 409.
  3. `GET /auth/me` với cookie → 200; không cookie → 401.
  4. verify-email với token từ outbox → 200; `me.emailVerified=true`; dùng lại token → 400.
  5. login sai mật khẩu → 401; đúng → 200.
  6. refresh: dùng `lh_rt` → 200 + cookie mới; dùng lại `lh_rt` cũ → 401.
  7. forgot-password → 204, outbox có mail reset; reset-password → 200; login mật khẩu mới → 200; refresh token cũ → 401.
  8. logout → 204; refresh sau logout → 401.
  9. `GET /auth/providers` → `{google:false, facebook:false}` (env test không có Google).
  10. Rate limit: 11 lần login sai liên tiếp → lần 11 trả 429.
- [ ] Commit `feat(api): auth (email/password, refresh rotation, verify, reset, google)`.

### Task 4: API lớp + roster + QR + giới hạn

- [ ] `excel-roster.parser.ts`: `parseRosterWorkbook(buffer): Promise<{name: string; parentPhone?: string}[]>` theo quyết định #5. Spec tạo workbook bằng exceljs trong bộ nhớ: (a) có tiêu đề `STT | Họ và tên | SĐT phụ huynh` → đúng tên + phone; (b) không tiêu đề, cột A → tên; (c) sheet rỗng → `[]`; (d) bỏ dòng trống, gộp khoảng trắng.
- [ ] `classes.service.ts`: `list(teacherId)`, `create(teacherId, input)` (sinh code duy nhất, thử lại khi trùng; `assertCanCreateClass`; track `class_created`), `getOrThrow(teacherId, id)` (404), `update`, `softDelete`, `hardDelete`, `regenerateCode`, `toSummary`, `toDetail`.
- [ ] `students.service.ts`: `importNames(teacherId, classId, names)` (parse đã ở client, server vẫn `parseNameLines` từng tên để chuẩn hóa; dedupe với tên đang có; `assertRosterCapacity`; `sortOrder` nối tiếp; track `roster_size {size}`), `importExcel(teacherId, classId, buffer)`, `update`, `remove` (soft), `reorder(ids)` (phải là đúng tập id chưa xóa).
- [ ] `qr.service.ts`: `png(text): Promise<Buffer>` (qrcode, width 512, margin 2, errorCorrectionLevel M).
- [ ] Controllers theo hợp đồng; `import-excel` dùng `FileInterceptor('file', { limits: { fileSize: 2*1024*1024 } })`, kiểm tra mimetype/xlsx magic (`PK`).
- [ ] e2e `classes.e2e-spec.ts`: tạo 2 lớp OK, lớp thứ 3 → 403 `LIMIT_CLASSES`; xóa mềm lớp → tạo được lớp mới; `GET /classes` không hiện lớp đã xóa; lớp của giáo viên khác → 404; regenerate-code đổi code hợp lệ 6 ký tự; `qr.png` → `image/png` và bắt đầu bằng magic PNG.
- [ ] e2e `roster.e2e-spec.ts`: import 3 tên có 2 trùng → `['Nam','Nam (2)','Bình']`, `added=3`; import thêm 'Nam' → 'Nam (3)'; import tới 50 rồi thêm 1 → 403 `LIMIT_STUDENTS`; import-excel (buffer tạo bằng exceljs) → đúng tên + parentPhone; PATCH tên; DELETE mềm rồi GET không còn; reorder đảo thứ tự → `sortOrder` cập nhật; reorder thiếu id → 400.
- [ ] Commit `feat(api): classes, roster import (paste/excel), QR, free limits`.

### Task 5: Web — nền tảng (api client, proxy, provider, UI cơ bản)

- [ ] `lib/api.ts`: `apiFetch<T>(path, {method, body, formData}): Promise<T>` dùng `NEXT_PUBLIC_API_URL`, `credentials:'include'`; 401 → gọi `POST /auth/refresh` một lần rồi thử lại; lỗi → `throw new ApiError(status, code, message)`.
- [ ] `proxy.ts`: matcher `['/app/:path*']`; không có cookie `lh_rt` → redirect `/login?next=…`.
- [ ] `lib/query.tsx` QueryClientProvider; `lib/auth.ts`: `useMe()` (query `/auth/me`, retry false), `useLogout()`.
- [ ] `components/ui/*`: Button (variants primary/secondary/danger/ghost, `loading`), Input, Field (label + lỗi), Dialog (native `<dialog>`), Tabs (aria), Alert (info/warning/error/success).
- [ ] `app/layout.tsx` bọc `QueryProvider`. Commit `feat(web): api client, proxy, query provider, ui kit`.

### Task 6: Web — trang auth

- [ ] `(auth)/layout.tsx`: khung giữa màn, logo chữ "Lớp Học".
- [ ] `/login`: form email + mật khẩu (react state, zod `loginSchema` ở client), nút Google (hiện khi `/auth/providers.google`), link quên mật khẩu, link đăng ký; thành công → `router.replace(next ?? '/app/classes')`.
- [ ] `/signup`: tên, email, mật khẩu, checkbox điều khoản (link `/terms`, `/privacy` – trang giữ chỗ S7); thành công → `/app/classes`.
- [ ] `/verify-email?token=`: gọi API khi mount, hiện kết quả + nút vào app.
- [ ] `/forgot-password`, `/reset-password?token=`.
- [ ] Commit `feat(web): auth pages`.

### Task 7: Web — shell giáo viên, danh sách lớp, chi tiết lớp (roster, cài đặt)

- [ ] `app/app/layout.tsx`: client; `useMe()` → loading / 401 → `/login`; topbar (tên, đăng xuất), sidebar (Lớp học, Ngân hàng câu hỏi (disabled), Đề kiểm tra (disabled)); banner "Email chưa xác thực – Gửi lại" khi `emailVerified=false`.
- [ ] `/app/classes`: grid thẻ lớp (tên, môn, khối, số học sinh, mã); nút "Tạo lớp" mở Dialog (tên, môn, khối, lịch tuần tối giản: chọn thứ + giờ, thêm/xóa dòng); khi `classes.length >= limits.maxClasses` nút khóa + Alert "Gói miễn phí tối đa 2 lớp".
- [ ] `/app/classes/[id]`: header (tên, mã lớn, nút sao chép), Tabs: **Danh sách** (roster-tab), **Buổi học** (placeholder "Có ở bước tiếp theo"), **Báo cáo** (placeholder), **Cài đặt** (settings-tab).
- [ ] `roster-tab.tsx`: khối nhập: textarea "Mỗi dòng một tên" + nút Thêm (client `parseNameLines`, hiện đếm), nút "Nhập Excel" (input file .xlsx); dòng nhắc trách nhiệm đồng ý của phụ huynh; bảng: STT, tên (sửa inline Enter/Escape), SĐT PH, nút lên/xuống, xóa (confirm); "Sắp xếp A→Z"; hiện `x/50`.
- [ ] `settings-tab.tsx`: tên/môn/khối (form lưu), công tắc "Khóa danh sách" (giải thích), khối mã lớp: mã to, QR `<img src=…/qr.png>`, nút tải QR, in (window.print với CSS `@media print`), "Tạo mã mới" (confirm); vùng nguy hiểm: xóa lớp (mềm) và xóa vĩnh viễn (nhập tên lớp để xác nhận).
- [ ] Kiểm tra thủ công qua trình duyệt (Playwright MCP): signup → tạo lớp → dán 5 tên (2 trùng) → thấy hậu tố → Excel → QR hiển thị → khóa roster → đăng xuất/đăng nhập. Chụp màn hình lưu scratchpad.
- [ ] `pnpm turbo run build lint typecheck test` + `pnpm test:e2e` xanh. Commit `feat(web): teacher shell, classes list, class detail (roster, settings)`.

### Task 8: Kết thúc S1

- [ ] Cập nhật README (biến env mới, luồng auth), ghi chú S1 vào `docs/superpowers/plans` (đánh dấu checkbox), commit `chore(s1): complete`.

## Tự kiểm tra

- Bao phủ: mục 3.1 (tạo lớp, roster dán/Excel, sửa/xóa/sắp xếp, hậu tố trùng, mã 6 ký tự regenerable, QR tải/in) → Task 4, 7; mục 2 auth (Google, email+mật khẩu, xác thực, reset, một teacher theo email) → Task 3, 6; `rosterLocked`, `requireStudentCode`, `studentCode` có trong schema và API → Task 4; giới hạn free 2 lớp/50 HS → Task 2, 4, 7; sự kiện `signup`, `class_created`, `roster_size` → Task 2–4; nhắc đồng ý roster → Task 7. Facebook: stub `facebook:false` (quyết định #6 của thiết kế). Gỡ thiết bị học sinh thuộc S4 (chưa có thiết bị).
- Nhất quán: `TeacherDto.emailVerified` dùng ở web banner; mã lỗi `LIMIT_CLASSES`/`LIMIT_STUDENTS` dùng ở web; cookie tên `lh_rt` dùng ở `proxy.ts`.
