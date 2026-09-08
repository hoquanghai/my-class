# Thiết kế MVP — Classroom Check-in App

Trạng thái: **ĐÃ DUYỆT** ngày 2026-09-08 (theo mục 11 của `mvp-requirements-classroom-app.md`). Các điểm mở ở mục 11 chốt theo phương án đề xuất, xem mục 12.
Ngày: 2026-09-08

Tài liệu này trả lời 3 câu hỏi: (1) kiến trúc và các lựa chọn kỹ thuật, (2) schema dữ liệu, (3) phân rã module + thứ tự triển khai. Phần cuối là danh sách điểm cần xác nhận.

---

## 1. Phạm vi và nguyên tắc

- Bám sát 6 module trong file yêu cầu, không thêm tính năng ngoài MVP.
- Schema thiết kế sẵn "chỗ trống" cho: phụ huynh, chủ trung tâm, nhiều giáo viên/lớp, học phí, tài khoản học sinh. Cụ thể: `Teacher.plan`, `Student.studentCode`, `Class.requireStudentCode`, `Student.parentPhone`, bảng `FeatureFlag`, mọi bảng nghiệp vụ đều có `teacherId` để sau này đổi thành `organizationId` không phải viết lại logic.
- Xóa mềm (`deletedAt`) cho Teacher, Class, Student, Question, Quiz. Xóa cứng lớp do giáo viên chủ động → cascade xuống Student, ClassSession, Attendance, QuizRun, Answer.

## 2. Kiến trúc và các lựa chọn

### 2.1 Kiến trúc chọn: monolith module hóa, stateless, một VPS + Docker Compose

Mục tiêu: chi phí vận hành thấp nhất ở giai đoạn thử nghiệm, nhưng mở rộng bằng cách **đổi cấu hình, không đổi code**. Toàn bộ backend là một codebase NestJS chia module rõ ràng (mục 5), đóng thành một Docker image, chạy được ở ba vai trò `api`, `worker`, `migrate` tùy entrypoint.

```
Cloudflare (gói free: DNS, CDN, TLS biên, chống DDoS, proxy WebSocket)
        │
        ▼
┌─ VPS Singapore 2 vCPU / 4 GB ── Docker Compose ───────────────────────┐
│  caddy ──▶ web   (Next.js standalone)                                  │
│        └─▶ api   ×1..N (NestJS + Socket.IO, stateless, Redis adapter)  │
│               │ BullMQ                                                 │
│            worker (cùng image; giai đoạn 1 chạy inline trong api)      │
│            postgres 16 (volume)          redis 7                       │
│            backup (pg_dump hằng ngày → R2, giữ 14 bản)                 │
└────────────────────────────────────────────────────────────────────────┘
        │                        │                        │
   Cloudflare R2            SMTP Brevo/Resend        AI API Claude/OpenAI
   (ảnh, file import,       (gói free đủ MVP)        (trả theo dùng, có quota
    free 10 GB, không                                 20 trang/tháng/giáo viên)
    phí egress)
```

Dev local: cùng Compose nhưng thay R2 bằng `minio`, SMTP bằng `mailpit`.

**Vì sao chọn phương án này thay vì các phương án khác**

| Phương án | Chi phí giai đoạn thử nghiệm | Đường scale | Nhận xét |
|---|---|---|---|
| **Monolith stateless trên 1 VPS + Compose (chọn)** | ≈ 15–30 USD/tháng | Dọc (resize VPS) → ngang (thêm replica `api`, tách DB/Redis sang managed) → K8s nếu cần; không đổi code | Ít nhà cung cấp, kiểm soát được vùng dữ liệu (Singapore), tải đích của MVP nằm gọn trong giai đoạn 1 |
| Serverless / PaaS nhiều nhà cung cấp (Vercel + Fly/Railway + Neon + Upstash) | Gần 0 khi không dùng, nhưng gói thương mại + server Socket.IO vẫn tốn 20–40 USD | Tự động | 4–5 vendor, hóa đơn khó đoán khi tăng, WebSocket không chạy trên Vercel, khó chứng minh vùng dữ liệu |
| Kubernetes từ đầu | 60–100+ USD/tháng (control plane + node) | Rất tốt | Quá tay cho giai đoạn nhận phản hồi, tốn công vận hành |

**Ba giai đoạn mở rộng**

| Giai đoạn | Tín hiệu chuyển | Việc cần làm | Chi phí ước tính |
|---|---|---|---|
| 1. Thử nghiệm | 0 → vài trăm giáo viên | 1 VPS 2 vCPU/4 GB tại Singapore, mọi thứ trong Compose. Cloudflare free, R2 free, SMTP free. AI trả theo dùng, quota chặn chi phí. | 15–30 USD/tháng |
| 2. Tăng trưởng | CPU > 70 % giờ cao điểm hoặc > 2 000 kết nối đồng thời kéo dài | Bước 1: resize VPS lên 4–8 vCPU (5 phút, không đổi gì). Bước 2: tách `worker` thành container riêng; chạy `api` 2–3 replica, Caddy cân bằng tải. Bước 3: chuyển Postgres/Redis sang managed vùng Singapore (DigitalOcean, Supabase, Upstash) bằng cách đổi `DATABASE_URL` / `REDIS_URL`. | 60–150 USD/tháng |
| 3. Quy mô lớn | Cần nhiều máy, cần HA | Cùng image chạy trên Kubernetes hoặc Docker Swarm nhiều node; Postgres thêm read replica; web đẩy lên CDN. | Theo nhu cầu |

Ước lượng tải: mục tiêu 50 quiz × 45 học sinh nộp trong 5 giây tương đương khoảng 2 250 kết nối WebSocket và 450 lượt ghi/giây. Một VPS 2 vCPU/4 GB dư sức cho mức này: Node giữ hàng chục nghìn kết nối, Postgres ghi vài nghìn dòng/giây. Load test ở S8 sẽ xác nhận con số này trước khi công bố.

**Quy tắc code để giai đoạn 2–3 chỉ là đổi cấu hình**

1. `api` stateless: JWT, không ghi đĩa cục bộ, không giữ trạng thái quiz trong RAM (PostgreSQL là nguồn sự thật, Redis là cache/đếm).
2. Socket.IO dùng Redis adapter từ ngày đầu; client chỉ dùng transport `websocket` nên thêm replica không cần sticky session.
3. Job nền (docx, AI, tổng hợp kết quả) đi qua BullMQ; `worker` là entrypoint riêng trong cùng image, env `WORKER_INLINE=true` để chạy chung với `api` ở giai đoạn 1.
4. Toàn bộ cấu hình qua env (12-factor). Ảnh/file chỉ lưu R2. Rate-limit và cache đặt trên Redis để đúng khi có nhiều instance.
5. Next.js `output: 'standalone'`; tài nguyên tĩnh cache ở Cloudflare.
6. Migration chạy bằng container one-off `migrate` trước khi lên bản mới. `api` có `/health` và graceful shutdown để rolling update không rớt kết nối học sinh.
7. Backup `pg_dump` hằng ngày đẩy lên R2, giữ 14 bản; README có bước restore và bước "chuyển sang managed DB".
8. Giám sát nhẹ: log JSON (pino) qua `docker logs`, Sentry gói free cho lỗi, Uptime Kuma tự host để cảnh báo downtime.

### 2.2 Các quyết định có nhiều phương án

**A. Nguồn sự thật cho trạng thái quiz đang chạy (QuizRun)**

| Phương án | Ưu | Nhược |
|---|---|---|
| **A1 (đề xuất)**: PostgreSQL là nguồn sự thật; Redis chỉ làm Socket.IO adapter + bộ đếm nóng (số câu trả lời/câu hỏi) + hàng đợi. | Refresh/reconnect khôi phục đúng trạng thái; crash không mất dữ liệu; đúng yêu cầu "reconnect-safe". | Mỗi lần submit ghi PG (≈450 ghi/giây ở tải đích, PG chịu tốt). |
| A2: Redis giữ toàn bộ trạng thái, cuối buổi mới ghi PG. | Nhanh nhất. | Mất dữ liệu nếu Redis restart; logic đồng bộ hai nơi phức tạp. |
| A3: Chỉ PG, không Redis. | Đơn giản nhất. | Không scale ngang Socket.IO; bộ đếm realtime phải query PG liên tục. |

Chọn **A1**. Broadcast bộ đếm được gom theo nhịp 250 ms/phòng để projector cập nhật < 1 s mà không spam.

**B. Công cụ monorepo**

- **B1 (đề xuất)**: pnpm workspaces + Turborepo. Nhẹ, cấu hình ít, cache build tốt cho CI.
- B2: Nx. Mạnh hơn nhưng nặng và nhiều khái niệm hơn mức cần cho 2 app + 1 package.

**C. Vị trí bộ parser câu hỏi (paste/docx)**

- **C1 (đề xuất)**: Parser thuần TypeScript đặt trong `packages/shared`, chạy được cả trình duyệt lẫn server. Paste text → preview tức thì ở client, không cần gọi API. Docx → server dùng mammoth lấy text + ảnh rồi gọi cùng parser.
- C2: Parser chỉ ở server. Đơn giản hơn một chút nhưng preview chậm và tốn request.

**D. Snapshot câu hỏi khi chạy quiz**

- **D1 (đề xuất)**: Khi launch quiz, sao chép nội dung câu hỏi vào `QuizRunQuestion.snapshot` (JSON). Sửa câu hỏi sau đó không làm sai kết quả cũ, báo cáo ổn định.
- D2: Tham chiếu trực tiếp `Question`. Tiết kiệm chỗ nhưng kết quả lịch sử có thể "đổi" khi giáo viên sửa câu.

**E. Xáo trộn đáp án**

- **E1 (đề xuất)**: Xáo theo từng lượt chạy (cùng thứ tự cho cả lớp, lưu trong snapshot). Projector hiển thị biểu đồ phân bố khớp với màn hình học sinh.
- E2: Xáo theo từng học sinh. Chống nhìn bài tốt hơn nhưng projector phải quy đổi nhãn, phức tạp hơn; để giai đoạn sau.

### 2.3 Stack chốt

| Thành phần | Chọn |
|---|---|
| Backend | NestJS 11, TypeScript, Prisma 6, PostgreSQL 16, Redis 7, Socket.IO 4 + `@socket.io/redis-adapter`, BullMQ (job AI/docx) |
| Frontend | Next.js 15 App Router, React 19, Tailwind 4, `next-intl` (vi), `@serwist/next` (PWA), KaTeX render LaTeX, `qrcode` |
| Auth | Passport (google, facebook, local), JWT access 15 phút + refresh 30 ngày (httpOnly cookie); học sinh: token HMAC ký bởi server |
| Storage | S3 client tương thích R2; dev dùng MinIO |
| Parse | `mammoth` + đọc XML docx (lấy bold/underline làm đáp án), `exceljs`, `pdf-lib`/`pdfjs` tách trang PDF thành ảnh |
| AI | `packages/ai-adapter`: interface `extractQuestions(images[]) → JSON schema`, hai implementation Claude / OpenAI, chọn bằng env `AI_PROVIDER` |
| Test | Jest (api unit + e2e supertest), Vitest (shared), Playwright (web smoke E2E), k6 (load test) |
| CI/CD | GitHub Actions: lint, typecheck, test, build image lên GHCR; deploy bằng `docker compose pull && up -d` qua SSH |
| Hạ tầng giai đoạn 1 | 1 VPS Singapore 2 vCPU/4 GB; Cloudflare free (DNS, CDN, TLS biên, proxy WebSocket); R2 free; SMTP Brevo hoặc Resend gói free; Sentry free; Uptime Kuma tự host |

## 3. Cấu trúc monorepo

```
.
├── apps/
│   ├── api/                 # NestJS, một image cho 3 vai trò
│   │   ├── prisma/          # schema.prisma, migrations, seed.ts
│   │   └── src/
│   │       ├── main.ts      # entrypoint api (WORKER_INLINE=true thì chạy kèm worker)
│   │       ├── worker.ts    # entrypoint worker BullMQ (tách riêng ở giai đoạn 2)
│   │       └── modules/...  # xem mục 5
│   └── web/                 # Next.js
│       └── app/             # xem mục 6
├── packages/
│   ├── shared/              # types, zod schemas, socket event contracts, grading, question-parser
│   └── ai-adapter/          # provider-agnostic extraction
├── infra/
│   ├── docker-compose.yml         # production giai đoạn 1: caddy, web, api, postgres, redis, backup
│   ├── docker-compose.scale.yml   # override giai đoạn 2: worker riêng, api nhiều replica, DB/Redis managed
│   ├── docker-compose.dev.yml     # postgres, redis, minio, mailpit
│   ├── Caddyfile                  # reverse proxy + cân bằng tải api, WebSocket passthrough
│   └── backup.sh                  # pg_dump hằng ngày → R2, giữ 14 bản
├── loadtest/k6-quiz.js
├── .github/workflows/ci.yml
└── README.md
```

## 4. Schema dữ liệu (Prisma)

Ghi chú chung: id dùng `cuid()`; mọi bảng có `createdAt`; bảng có sửa đổi có `updatedAt`; bảng xóa mềm có `deletedAt`. Enum viết dạng chuỗi để đổi không cần migration nặng.

### 4.1 Giáo viên và xác thực

```prisma
model Teacher {
  id              String    @id @default(cuid())
  email           String    @unique
  emailVerifiedAt DateTime?
  name            String
  avatarUrl       String?
  passwordHash    String?               // null nếu chỉ đăng nhập OAuth
  plan            String    @default("free")
  acceptedTermsAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
}

model AuthIdentity {                     // liên kết Google/Facebook về 1 Teacher theo email đã xác thực
  id             String   @id @default(cuid())
  teacherId      String
  provider       String                  // google | facebook
  providerUserId String
  createdAt      DateTime @default(now())
  @@unique([provider, providerUserId])
}

model EmailToken {                       // xác thực email, reset mật khẩu
  id        String    @id @default(cuid())
  teacherId String
  type      String                       // verify | reset
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}

model RefreshToken {
  id        String    @id @default(cuid())
  teacherId String
  tokenHash String    @unique
  userAgent String?
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())
}
```

### 4.2 Lớp và danh sách học sinh

```prisma
model Class {
  id                 String    @id @default(cuid())
  teacherId          String
  name               String
  subject            String?
  grade              String?              // "1".."12", free text cho phép "Ôn thi"
  schedule           Json?                // [{ weekday: 1..7, start: "18:00", end: "19:30" }]
  code               String    @unique    // 6 ký tự, bảng chữ không nhầm lẫn (bỏ 0/O/1/I/L)
  requireStudentCode Boolean   @default(false)
  rosterLocked       Boolean   @default(false)  // khóa: tên đã gắn thiết bị không chọn được từ máy khác
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?
  @@index([teacherId])
}

model Student {
  id          String    @id @default(cuid())
  classId     String
  name        String                       // đã tự thêm hậu tố nếu trùng: "Nam", "Nam (2)"
  studentCode String?                      // để dành cho mã học sinh sau này
  parentPhone String?                      // lưu, chưa dùng
  sortOrder   Int
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  @@index([classId])
  // Unique (classId, name) với điều kiện deletedAt IS NULL: tạo bằng partial index trong migration SQL
}

model StudentDevice {                      // thiết bị đã gắn với học sinh
  id         String    @id @default(cuid())
  studentId  String
  classId    String
  tokenHash  String    @unique             // token ký HMAC gửi về cookie + localStorage
  userAgent  String?
  lastSeenAt DateTime  @default(now())
  revokedAt  DateTime?                     // giáo viên "gỡ thiết bị"
  createdAt  DateTime  @default(now())
  @@index([studentId])
}
```

### 4.3 Buổi học, điểm danh, tham gia

```prisma
model ClassSession {
  id        String    @id @default(cuid())
  classId   String
  teacherId String
  status    String    @default("active")  // active | ended
  startedAt DateTime  @default(now())
  endedAt   DateTime?
  note      String?
  createdAt DateTime  @default(now())
  @@index([classId, startedAt])
}

model AttendanceRecord {
  id        String   @id @default(cuid())
  sessionId String
  studentId String
  status    String                         // present | absent | late | excused
  note      String?
  markedAt  DateTime @default(now())
  @@unique([sessionId, studentId])
}

model SessionParticipant {                 // học sinh đã quét mã và chọn tên trong buổi này
  id         String   @id @default(cuid())
  sessionId  String
  studentId  String
  deviceId   String
  joinedAt   DateTime @default(now())
  lastSeenAt DateTime @default(now())
  @@unique([sessionId, studentId])
}
```

### 4.4 Ngân hàng câu hỏi

```prisma
model Question {
  id              String    @id @default(cuid())
  teacherId       String
  type            String                   // single_choice | multiple_choice | true_false | short_text
  stemMd          String                   // Markdown + LaTeX $...$
  explanationMd   String?
  imageKey        String?                  // key trên R2
  subject         String?
  grade           String?
  topic           String?                  // chương/chủ đề
  difficulty      String?                  // nhan_biet | thong_hieu | van_dung
  source          String                   // paste | docx | image_ai | manual
  acceptedAnswers Json?                    // short_text: ["đáp án 1", "đáp án 2"]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  @@index([teacherId, subject, grade, topic, difficulty])
}

model QuestionOption {
  id         String  @id @default(cuid())
  questionId String
  label      String                        // A, B, C, D
  contentMd  String
  imageKey   String?
  isCorrect  Boolean @default(false)
  sortOrder  Int
  @@index([questionId])
}

model ImportJob {                          // docx và AI chạy nền; cũng là sổ ghi quota AI
  id         String    @id @default(cuid())
  teacherId  String
  source     String                        // docx | image_ai
  status     String    @default("pending") // pending | processing | done | failed
  pageCount  Int       @default(0)         // dùng tính quota AI theo tháng
  inputKeys  Json                          // key file trên R2
  result     Json?                         // câu hỏi đã parse, chưa lưu vào bank
  error      String?
  createdAt  DateTime  @default(now())
  finishedAt DateTime?
  @@index([teacherId, source, createdAt])
}

model MediaFile {                          // theo dõi file trên R2 để dọn rác sau này
  id        String   @id @default(cuid())
  teacherId String
  key       String   @unique
  mime      String
  sizeBytes Int
  createdAt DateTime @default(now())
}
```

### 4.5 Đề kiểm tra (Quiz)

```prisma
model Quiz {
  id                  String    @id @default(cuid())
  teacherId           String
  title               String
  description         String?
  defaultTimeLimitSec Int       @default(30)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?
  @@index([teacherId])
}

model QuizQuestion {
  id           String @id @default(cuid())
  quizId       String
  questionId   String
  sortOrder    Int
  timeLimitSec Int?                        // null → dùng defaultTimeLimitSec
  points       Int    @default(1)
  @@unique([quizId, questionId])
}
```

### 4.6 Lượt kiểm tra đầu giờ (QuizRun)

```prisma
model QuizRun {
  id               String    @id @default(cuid())
  sessionId        String
  quizId           String
  mode             String                  // paced | self_paced
  shuffleQuestions Boolean   @default(false)
  shuffleOptions   Boolean   @default(false)
  status           String    @default("lobby") // lobby | in_progress | finished
  currentIndex     Int?                    // paced: câu đang mở (0-based)
  questionOpenedAt DateTime?               // paced
  questionClosedAt DateTime?               // paced: null = đang mở
  deadlineAt       DateTime?               // self_paced
  startedAt        DateTime?
  endedAt          DateTime?
  createdAt        DateTime  @default(now())
  @@index([sessionId])
}

model QuizRunQuestion {                    // bản chụp câu hỏi theo thứ tự đã xáo
  id           String @id @default(cuid())
  runId        String
  questionId   String
  sortOrder    Int
  timeLimitSec Int
  points       Int
  snapshot     Json                        // { type, stemMd, imageKey, options:[{id,label,contentMd,imageKey}], correctOptionIds, acceptedAnswers }
  @@unique([runId, sortOrder])
}

model Answer {
  id                  String   @id @default(cuid())
  runId               String
  runQuestionId       String
  studentId           String
  selectedOptionIds   Json?                // trắc nghiệm
  textAnswer          String?              // short_text
  isCorrect           Boolean?
  pointsAwarded       Int      @default(0)
  overriddenByTeacher Boolean  @default(false)
  responseMs          Int?                 // để xếp hạng khi bằng điểm
  submittedAt         DateTime @default(now())
  @@unique([runQuestionId, studentId])     // chống nộp trùng khi retry
  @@index([runId, studentId])
}

model QuizRunResult {                      // tổng hợp khi kết thúc lượt, phục vụ báo cáo
  id            String    @id @default(cuid())
  runId         String
  studentId     String
  score         Int
  correctCount  Int
  answeredCount Int
  rank          Int?
  finishedAt    DateTime?
  @@unique([runId, studentId])
}
```

### 4.7 Phản hồi, đo lường, feature flag

```prisma
model SessionFeedback {
  id        String   @id @default(cuid())
  sessionId String   @unique
  teacherId String
  rating    Int                            // 1..5
  comment   String?
  createdAt DateTime @default(now())
}

model AnalyticsEvent {
  id        String   @id @default(cuid())
  teacherId String?
  name      String                         // signup, class_created, roster_size, ...
  props     Json
  createdAt DateTime @default(now())
  @@index([name, createdAt])
}

model FeatureFlag {
  key       String   @id                   // ví dụ: free.max_classes
  value     Json
  updatedAt DateTime @updatedAt
}
```

Seed `FeatureFlag`:

```
free.max_classes            = 2
free.max_students_per_class = 50
free.ai_pages_per_month     = 20
free.history_days           = 30
free.export_enabled         = false
ai_extraction.enabled       = true
```

Flag được cache trong Redis 60 giây; đổi giá trị bằng SQL/seed, không cần deploy. Không có UI admin trong MVP.

## 5. Phân rã module backend (`apps/api/src/modules`)

| Module | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `auth` | Google/Facebook OAuth, email+mật khẩu, xác thực email, reset mật khẩu, JWT + refresh, guard giáo viên; `StudentTokenGuard` cho học sinh | teachers, mailer |
| `teachers` | Hồ sơ, chấp nhận điều khoản, plan | — |
| `classes` | CRUD lớp, sinh mã lớp + QR, import roster (paste/Excel), sắp xếp, khóa roster, gỡ thiết bị, kiểm tra giới hạn free | feature-flags, storage |
| `students` | Luồng học sinh: nhập mã → danh sách tên → chọn tên → phát token thiết bị; kiểm tra khóa roster | classes |
| `sessions` | Bắt đầu/kết thúc buổi, điểm danh (đơn, hàng loạt, hoàn tác, ghi chú), lịch sử điểm danh, tham gia buổi | classes |
| `questions` | CRUD ngân hàng câu hỏi, lọc theo tag, upload ảnh; `import/paste` (parser shared), `import/docx` (mammoth → parser), `import/ai` (job BullMQ → AI adapter), quota AI | storage, ai-adapter, feature-flags |
| `quizzes` | CRUD quiz, chọn tay hoặc random N theo bộ lọc | questions |
| `runs` | Máy trạng thái QuizRun (lobby → in_progress → finished), snapshot câu hỏi, nhận bài, chấm tự động, giáo viên sửa điểm, tổng hợp kết quả | quizzes, sessions, realtime |
| `realtime` | Socket.IO gateway 3 namespace `/teacher`, `/student`, `/present`; phòng theo `sessionId`; Redis adapter; gửi snapshot trạng thái khi (re)connect | runs |
| `reports` | Theo buổi (điểm danh + bảng điểm), theo lớp (xu hướng 10 buổi, tỷ lệ chuyên cần); áp `history_days`, `export_enabled` | sessions, runs |
| `analytics` | Ghi `AnalyticsEvent`; endpoint client gửi event; helper server-side | — |
| `feedback` | Đánh giá sau buổi | sessions |
| `feature-flags` | Đọc/cache flag, helper `limit(teacher, key)` | — |
| `storage` | Presigned upload/download R2 (MinIO ở dev), ghi `MediaFile` | — |
| `mailer` | Gửi email qua SMTP (Mailpit ở dev), template vi | — |
| `common` | PrismaService, config/env validation (zod), exception filter, pipes, logger | — |

`packages/shared` xuất: kiểu dữ liệu + zod schema cho mọi DTO; `question-parser` (paste/docx text → câu hỏi + đáp án + dòng lỗi); `grading` (chuẩn hóa không dấu, so khớp); `socket-events` (tên event + payload type dùng chung cho api và web).

## 6. Phân rã frontend (`apps/web/app`)

| Nhóm route | Trang | Đối tượng, thiết bị |
|---|---|---|
| `(marketing)` | `/` landing (demo 60s placeholder, "Dùng thử miễn phí", Zalo/Facebook), `/privacy`, `/terms` | Công khai |
| `(auth)` | `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password` | Giáo viên |
| `(teacher)` `/app` | `/app/classes`, `/app/classes/[id]` (tab: Danh sách, Buổi học, Báo cáo, Cài đặt/QR), `/app/sessions/[id]` (điểm danh + nút "Kiểm tra đầu giờ" + điều khiển quiz + kết thúc buổi & feedback), `/app/questions` (bank + bộ lọc), `/app/questions/import` (3 tab: Dán/Docx, Ảnh/PDF AI, Soạn tay → chung lưới preview-and-fix), `/app/quizzes`, `/app/quizzes/[id]` | Giáo viên, desktop-first |
| `(student)` | `/join` (nhập mã), `/join/[code]` (chọn tên), `/s/[sessionId]` (chờ → làm bài → điểm của mình) | Học sinh, mobile-first, không app chrome |
| `(present)` | `/present/[sessionId]` (lobby → câu hỏi + bộ đếm → kết quả câu → bảng xếp hạng) | Máy chiếu, tối, chữ lớn, 720p |

Thành phần dùng chung: `MarkdownLatex` (react-markdown + KaTeX), `QuestionGrid` (lưới preview/sửa), `QuestionEditor` (soạn tay keyboard-first), `RosterTiles`, `QrCard`, `LockedFeatureButton`, `useSocket(namespace, sessionId)` với hàng đợi retry cho học sinh.

## 7. Giao thức realtime (Socket.IO)

Phòng: `session:{sessionId}`. Mỗi client khi connect gửi `auth` (JWT giáo viên hoặc token thiết bị học sinh; projector không cần auth nhưng chỉ nhận dữ liệu công khai).

| Chiều | Event | Payload |
|---|---|---|
| teacher → server | `run:start`, `run:next`, `run:close`, `run:reveal`, `run:finish`, `run:set_deadline` | `{ runId, ... }` |
| student → server | `session:join`, `answer:submit` | `{ runQuestionId, selectedOptionIds \| textAnswer, clientRequestId }` |
| server → tất cả | `run:state` (snapshot đầy đủ khi connect/reconnect), `lobby:participants`, `run:question_opened`, `run:answer_count` (gom 250 ms), `run:question_result`, `run:leaderboard`, `run:finished` | — |
| server → student | `answer:ack` | `{ clientRequestId, accepted, isCorrect? }` |

`answer:submit` idempotent theo `(runQuestionId, studentId)`; client giữ hàng đợi offline và gửi lại khi có mạng.

## 8. Quy tắc chấm điểm (giả định cần xác nhận)

- Chọn một / đúng-sai: đúng khi chọn đúng phương án.
- Nhiều lựa chọn: **đúng hết mới được điểm** (không điểm từng phần).
- Trả lời ngắn: chuẩn hóa hai vế (trim, thường hóa, bỏ dấu tiếng Việt, gộp khoảng trắng) rồi so khớp với bất kỳ đáp án nào trong `acceptedAnswers`.
- Điểm: đúng = trọn `points`, sai = 0. **Không thưởng tốc độ.** Bằng điểm xếp theo tổng `responseMs` nhỏ hơn.
- Nộp sau khi câu đóng/hết hạn: từ chối, trả `accepted=false`.
- Giáo viên có thể sửa `isCorrect` từng bài (đặt `overriddenByTeacher`), hệ thống tính lại `QuizRunResult`.

## 9. Kiểm thử và chất lượng

- `packages/shared`: unit test cho parser (bộ mẫu đề thi Việt Nam: `Câu 1`, `1.`, `1)`, `Bài 1`; đáp án dạng bảng, `1-B`, `Câu 1: B`, dấu `*`) và grading.
- `apps/api`: unit test máy trạng thái QuizRun, quota AI, giới hạn free; e2e supertest theo từng slice.
- `apps/web`: Playwright smoke chạy luồng đầy đủ signup → lớp → roster → điểm danh → import → quiz → projector → báo cáo.
- `loadtest/k6-quiz.js`: 50 phòng × 45 học sinh nộp trong 5 giây, đo p95 ack và độ trễ projector.

## 10. Thứ tự triển khai

| Slice | Nội dung | Kết quả kiểm chứng được |
|---|---|---|
| S0 | Khởi tạo monorepo, docker-compose dev, Prisma schema + migration + seed, CI lint/test | `pnpm dev` chạy api + web, CI xanh |
| S1 | Auth (email + Google; Facebook để sau, xem câu hỏi 6) + lớp + roster + mã/QR + giới hạn free | Giáo viên tạo lớp, dán roster, in QR |
| S2 | Buổi học + điểm danh + lịch sử | Điểm danh trên điện thoại |
| S3a | Parser paste + docx + lưới preview-and-fix + lưu vào bank + bộ lọc | Import đề Word 20 câu, sửa, lưu |
| S3b | Soạn tay keyboard-first, dán ảnh clipboard, LaTeX live | — |
| S3c | AI ảnh/PDF qua job nền + quota | Chụp đề giấy → câu hỏi |
| S4 | Quiz builder + QuizRun + học sinh join/làm bài + chấm | Cả lớp làm bài trên điện thoại |
| S5 | Projector `/present` + điều khiển realtime + reconnect | Chiếu lên máy chiếu |
| S6 | Báo cáo buổi/lớp + nút khóa export | — |
| S7 | Analytics events + feedback sau buổi + landing + privacy/terms | — |
| S8 | Load test k6, README (local/deploy/env/restore/chuyển managed DB), compose production + Caddy + backup, Cloudflare, workflow deploy, thử `docker-compose.scale.yml` với 2 replica api | Chạy thử trên VPS, load test đạt mục tiêu |

Mỗi slice: viết test trước cho logic cốt lõi, ghi log tiến độ, dừng lại báo cáo trước khi sang slice kế tiếp.

## 11. Điểm cần xác nhận trước khi code

1. **Chấm điểm** theo mục 8 (nhiều lựa chọn đúng hết mới có điểm, không thưởng tốc độ, mặc định 1 điểm/câu) — đồng ý?
2. **Một buổi học có thể chạy nhiều lượt quiz** (0..n QuizRun / ClassSession) — đồng ý, hay giới hạn 1?
3. **AI provider** mặc định Claude (`AI_PROVIDER=claude`), có thể đổi sang OpenAI bằng env. Anh/chị đã có API key nào chưa? (chỉ cần khi tới S3c)
4. **Email**: dev dùng Mailpit; production cần SMTP (Gmail SMTP, Brevo, Resend...). Đã có dịch vụ nào chưa? (cần khi deploy)
5. **Feature flag** chỉnh bằng SQL/seed, không có UI admin trong MVP — đồng ý?
6. **Facebook OAuth** cần Facebook App đã review quyền email. Đề xuất: S1 làm email + Google, Facebook nối sau khi có app (code stub sẵn) — đồng ý?
7. **Tên dự án / package scope** để đặt tên thư mục, Docker image, tiêu đề app. Tạm dùng `lophoc` nếu chưa có tên.
8. **Git**: khởi tạo repo tại thư mục này và commit theo từng slice — đồng ý?

## 12. Quyết định đã chốt (2026-09-08)

| # | Quyết định |
|---|---|
| 1 | Chấm điểm theo mục 8: nhiều lựa chọn đúng hết mới có điểm, không thưởng tốc độ, mặc định 1 điểm/câu. |
| 2 | Một buổi học chạy được nhiều lượt quiz (0..n QuizRun / ClassSession), mỗi thời điểm chỉ 1 lượt chưa kết thúc. |
| 3 | `AI_PROVIDER=claude` mặc định, OpenAI qua env. Chưa có key; S3c chạy được với adapter giả lập (`AI_PROVIDER=mock`) cho đến khi có key. |
| 4 | Dev dùng Mailpit; production nhận SMTP qua env (`SMTP_HOST/PORT/USER/PASS`), chọn nhà cung cấp khi deploy. |
| 5 | Feature flag chỉnh bằng SQL/seed, không có UI admin. |
| 6 | S1 làm email + Google. Facebook OAuth để stub sẵn strategy, bật khi có Facebook App. |
| 7 | Tên tạm `lophoc`: scope npm `@lophoc/*`, image `lophoc-api`, `lophoc-web`. |
| 8 | Khởi tạo git tại thư mục này, commit theo từng slice. |
