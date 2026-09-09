# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Lớp Học (`lophoc`) is a free web app for tutoring-center teachers: classes and rosters, attendance, a question bank (paste / Word / AI image import), start-of-class quizzes that students answer on their phones, projector mode, reports. pnpm workspaces + Turborepo monorepo.

Read these before starting a slice, in order:

1. `mvp-requirements-classroom-app.md` — requirements, free-tier limits, non-goals, working method (§11).
2. `docs/superpowers/specs/2026-09-08-classroom-app-design.md` — approved architecture, Prisma schema rationale, module breakdown, slice order S0–S8, decisions (§12).
3. `docs/superpowers/plans/*.md` — one plan per slice, each with a status header at the top. S0–S4 are complete; S5 (projector `/present/[sessionId]`, realtime control) is next, then S6 reports, S7 analytics/feedback/landing, S8 deploy + load test.

Conventions that are not obvious from the code:

- Reply to the user in Vietnamese. UI strings, code comments, docs, error messages, and plan/spec files are Vietnamese; identifiers are English.
- Working method (requirements §11): propose schema/module breakdown and wait for approval before implementing; log progress step by step; build in vertical slices shared → api → web; commit per slice; update the plan's status header when a slice completes.
- Commit subjects use conventional-commit style scoped by package or slice: `feat(api): …`, `feat(web): …`, `feat(shared): …`, `chore(s2): …`, `docs(s3): …`.

## Commands

Prereqs: Node 24, pnpm 9 (`corepack enable`), Docker Desktop.

```bash
pnpm install
pnpm infra:up                 # postgres :5433 (not 5432), redis :6379, minio :9000/:9001, mailpit :8025/:1025
cp apps/api/.env.example apps/api/.env          # or keep personal secrets in apps/api/.env.dev (gitignored): in dev, Nest and prisma.config.ts load .env.dev first, then .env
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate               # prisma migrate dev in apps/api (also regenerates the client)
pnpm db:seed                  # demo teacher demo@lophoc.app / demo1234, class code DEM268, feature flags
pnpm dev                      # api :4000 (REST under /api, Socket.IO namespace /rt), web :3000
```

Verification (this is exactly what CI runs):

```bash
pnpm format:check                            # prettier
pnpm turbo run build lint typecheck test     # every package
pnpm test:e2e                                # api e2e against the lophoc_test database (infra must be up)
```

Single package or single test:

```bash
pnpm --filter @lophoc/api db:generate                                # run once before calling api scripts directly; turbo does it automatically
pnpm --filter @lophoc/shared exec vitest run src/runs/grading.spec.ts
pnpm --filter @lophoc/api exec vitest run src/modules/auth/tokens.spec.ts
pnpm --filter @lophoc/api test:e2e test/runs.e2e-spec.ts             # migrates lophoc_test, then runs one e2e file
pnpm --filter @lophoc/api db:studio
docker build -f apps/api/Dockerfile -t lophoc-api .                  # images build from the repo root
```

Build-graph notes:

- Turbo tasks `build`, `lint`, `typecheck`, `test` depend on `^build` and `db:generate`. `@lophoc/web#typecheck` also depends on its own `build` because `next typegen` needs `.next/types`.
- `apps/api` and `apps/web` import `@lophoc/shared` and `@lophoc/ai-adapter` from their `dist/`. After editing a package, rebuild it (`pnpm --filter @lophoc/shared build`) or rely on `pnpm dev`, which runs `tsc --watch` for packages.
- The Prisma client is generated into `apps/api/src/generated/prisma` (gitignored, ESM with `.js` import extensions). `prisma.config.ts` loads `.env` or `.env.test` based on `NODE_ENV`.
- e2e config: `apps/api/.env.test` is committed (no secrets) and selects in-memory drivers for mail, storage, queue, and Socket.IO adapter, plus `AI_PROVIDER=mock`. `test/setup-e2e.ts` sets `THROTTLE_SKIP=true`; `auth-throttle.e2e-spec.ts` re-enables it. e2e files run serially (`fileParallelism: false`).

## Architecture

### Packages

- AI import accepts images (≤10), or one document: PDF (≤20 pages) or `.tex`/`.txt`/`.md`. Word is rejected outright (user decision 2026-09-09: MathType/Equation formulas are not in the text and the model invents them); the 400 message tells the teacher to save as PDF. Accepted `.tex`/`.txt`/`.md` (sent as a `text` page; quota = 3,000 chars per page). Catalog of accepted types: `packages/shared/src/questions/ai-files.ts`; `ExtractionPage` has kind `text` and every provider sends it as a text block.
- Question classification: `subject` and `grade` on Question use the same catalog keys as Class (`questionSubjectSchema`/`questionGradeSchema`, migration `question_subject_grade_catalog`), `topic` is required free text (collapsed whitespace, ≤80 chars) owned by the teacher; `GET /questions/facets?subject=&grade=` returns the topics already used for that subject/grade so the web `ClassifyInputs` combobox offers them (choose or type a new one). The import page has two tabs only (AI from image/PDF, manual); paste/docx endpoints still exist in the API but have no UI.
- Noise filtering: `questions/noise.ts` (`isNoiseLine`, `stripStemNoise`) is the single list of "râu ria" patterns (school/center/teacher lines, chương/bài/phần/chủ đề titles, all-caps titles, footers, websites, HẾT). The paste/Word parser skips those lines, treats a title-case "Bài N." as a header when the document numbers questions with "Câu", and ignores a topic heading "A. …" that follows a completed question; `cleanExtractedQuestions()` applies the same rules to AI output before `extractedToParsed()`. Extend the list there, not in the parser or the prompt.
- `packages/shared` (`@lophoc/shared`): zod schemas (`<domain>/schemas.ts`) and DTO types (`<domain>/types.ts`) for every API payload, plus pure logic that must run in both browser and server: the Vietnamese question parser (`questions/parser`), roster name parsing/dedupe, `text/normalize`, grading and ranking (`runs/grading.ts`), and `socket-events.ts` (event names, payload types, `RT_NAMESPACE`, `sessionRoom()`). `ErrorCodes` lives in `classes/types.ts`. No Node-only dependencies.
- `packages/ai-adapter`: `QuestionExtractor` interface with Claude (default `claude-sonnet-5`), OpenAI, Gemini (`@google/genai`, default `gemini-3.7-flash`, thinking LOW), mock, and `CascadeExtractor`; `createExtractor(config)` picks by `AI_PROVIDER`. Throws `ExtractionError` with a `code`. Cascade (`AI_PROVIDER=cascade`): the primary model extracts the whole document once, `assessQuestions()` in `quality.ts` flags questions by rule (lost formulas, unbalanced LaTeX, empty options, odd option counts) and groups them by the `page` field the model fills, then only flagged pages are re-sent one at a time (PDFs split with pdf-lib, `pageContext` in the prompt) to the escalation model, capped by `AI_ESCALATION_MAX_SHARE`; a primary API error falls back to the escalation model for the whole document. `ExtractionResult` carries `stages`, `escalatedPages`, and `estimatedUsd` from `pricing.ts` (manual price table), stored as `ParseResult.meta` on the ImportJob.
- `apps/api`: NestJS 12 in ESM (relative imports need `.js` extensions), Prisma 7 with `@prisma/adapter-pg`, Socket.IO, BullMQ, argon2.
- `apps/web`: Next.js 16 App Router, React 19, Tailwind 4, next-intl with a single locale `vi` (`messages/vi.json`), TanStack Query, socket.io-client.

### API request pipeline

`configureApp()` in `apps/api/src/app.setup.ts` is shared by `main.ts` and the e2e `createTestApp()`. Put global setup there, never only in `main.ts`. It sets the `/api` prefix, cookie parser, `StandardSchemaValidationPipe`, `HttpExceptionFilter`, and the Socket.IO adapter (Redis-backed only when `REALTIME_ADAPTER=redis`).

- Bodies are validated with `@Body({ schema: someZodSchema })` using schemas imported from `@lophoc/shared`; there are no class-validator DTOs.
- `HttpExceptionFilter` normalizes every error to `{ statusCode, code?, message }`. For business errors the web branches on, throw an `HttpException` whose body includes `code: ErrorCodes.X` (see `runs.service.ts`, `limits.service.ts`).
- Two global guards, both of which skip non-HTTP contexts because the Socket.IO gateway authenticates on connect:
  - `JwtAuthGuard`: default is a teacher access JWT (cookie `lh_at` or Bearer) exposed via `@CurrentTeacher()`. `@Public()` skips auth. `@StudentRoute()` expects a student device token (cookie `lh_st` or Bearer; JWT with `kind: 'student'`, checked against `StudentDevice.revokedAt`) exposed via `@CurrentStudent()` as `{ deviceId, studentId, classId }`.
  - `HttpThrottlerGuard`: 120 req/min/IP globally; auth endpoints use `@Throttle(AUTH_THROTTLE)` for 10/min.
- Env is a zod schema in `config/env.ts`, validated at boot; read with `ConfigService<Env, true>` and `{ infer: true }`. Driver-style switches select in-memory implementations for tests and single-instance runs: `MAIL_TRANSPORT`, `STORAGE_DRIVER`, `AI_PROVIDER`, `QUEUE_DRIVER` (bullmq | inline), `REALTIME_ADAPTER` (redis | memory), `WORKER_INLINE`.

### Module conventions

One folder per domain under `src/modules/` with `*.module.ts`, `*.controller.ts`, `*.service.ts`. `Prisma`, `FeatureFlags`, `Mailer`, `Storage`, `Analytics`, and `Realtime` are `@Global()`.

- Service methods take `teacherId` first and scope every query by it (`where: { teacherId, deletedAt: null }`). Another teacher's resource is a 404, never a 403.
- Soft delete via `deletedAt` on Teacher, Class, Student, Question, Quiz. Hard-deleting a class cascades.
- Services map Prisma rows to shared DTOs through exported `toXxxDto` / `toXxxDetail` functions so other modules reuse them (e.g. `toQuestionDto` is used by quizzes).
- Class `subject` and `grade` are required and validated against the catalog in `packages/shared/src/education.ts` (`SUBJECTS` keys such as `toan`, `GRADES` `'6'`–`'12'`, plus `TEACHING_LEVELS` shared with the teacher profile). Store keys, render labels with `SUBJECT_LABELS` / `subjectLabel()` (web: `ClassMeta`, `SubjectGradeFields` in `components/classes`). Migration `class_subject_grade_catalog` mapped legacy free text; the question bank keeps free-text tags.
- Student cap is per teacher (`free.max_students_per_teacher`, default 30, across every non-deleted class) in addition to per class (50). `LimitsService.rosterCapacity()` returns the remaining slots; `studentLimitError()` throws 403 `LIMIT_STUDENTS` with `details: StudentLimitDetails`, which `HttpExceptionFilter` passes through. Import endpoints accept `?fit=1` to insert only the first `remaining` rows and report `skipped`; the web `RosterLimitDialog` offers "Nâng cấp gói" (`/app/upgrade`) or "Chỉ nhập N học sinh đầu". `GET /limits` includes `usage`.
- Free-tier limits and AI quota come from `FeatureFlag` rows (`free.*` keys seeded in `prisma/seed.ts`; changed via SQL or seed, no admin UI) through `LimitsService`.
- `AiImportQueue` wraps BullMQ; with `QUEUE_DRIVER=inline` it runs the processor in-process via `setImmediate`. The worker runs inside the api process while `WORKER_INLINE=true`.

### Quiz run engine and realtime

Principle: "REST for commands, Socket.IO for state". PostgreSQL is the source of truth; nothing about a run lives in RAM.

- All mutations are HTTP (`runs.controller.ts`): launch, start, next, close, finish, override answer. Students submit through `POST /student/runs/:id/answers`, accepted until close/deadline plus a 3 s grace window. Paced: one answer per `(runQuestionId, studentId)`, a repeat returns `accepted: false`. Self-paced: every selection is saved immediately and may be changed until the student calls `POST /student/runs/:id/submit` once (`QuizRunResult.submittedAt`; later answers get 409 `RUN_SUBMITTED`; `StudentRunViewDto.submittedAt`, `RunParticipant.submitted`, `submittedCount`). Results and correct answers are revealed only when the run finishes, never at submit time.
- `RunDeadlineService` auto-finishes self-paced runs at `deadlineAt` + 3 s: a per-run timer armed on start, plus a sweep at boot and every 30 s so nothing stays `in_progress` after its deadline (PostgreSQL is still the source of truth; `finishRun` uses a conditional `updateMany` so concurrent finishes are safe). `RunsService` registers the handler via `onExpire()` to avoid a circular import. e2e tests trigger it with `app.get(RunDeadlineService).sweep()` after backdating `deadlineAt`.
- On launch, questions are snapshotted into `QuizRunQuestion.snapshot` (JSON, options shuffled once per run), so later edits to the bank never change past results.
- `RunStateService.toPublicState()` builds `RunPublicStateDto` (no correct answers until a question closes) from a run loaded with `runInclude`. `RunBroadcaster.schedule(sessionId)` coalesces emits per session to 250 ms; `emitNow()` is used for start/finish. Every service method that changes run state must call the broadcaster.
- `RtGateway` serves namespace `/rt`. Clients pass `handshake.auth = { role: 'teacher' | 'student' | 'present', token? }` (cookies are the fallback); `present` needs no token and only receives public state. The client emits `session:join { sessionId }`; the server immediately replies with `session:state` and `run:state`, so refresh and reconnect always recover. Room name is `session:{id}`.
- Grading rules (`packages/shared/src/runs/grading.ts`): single choice and true/false need the correct option; multiple choice is all-or-nothing; short text uses `normalizeText` against `acceptedAnswers`; no speed bonus; ties are broken by lower total `responseMs`.

### Community (shared question sets)

Design: `docs/superpowers/specs/2026-09-09-community-design.md`. Teachers publish a **set** (`SharedSet`) from selected bank questions or a whole quiz; questions are snapshotted into `SharedSetQuestion.snapshot` (`originQuestionId` kept only for usage stats), so later bank edits never change a published set and "Đăng bản mới" bumps `version`. Statuses `draft | published | unlisted | archived` plus system flags `hiddenAt` (auto when `reportCount` ≥ flag `community.report_auto_hide`, default 3, or set by SQL) and `featuredAt` (SQL, sorts first). Visibility: the author always; others only `published`/`unlisted` that are not hidden (else 404). Publishing, commenting and reporting require a verified email (`EMAIL_NOT_VERIFIED`); the community is never public (answers are shown to teachers only). Cloning (`POST /community/sets/:id/clone`) copies every snapshot into the caller's bank with `source: 'community'` and `Question.sharedSetId`, optionally creating a quiz, capped per 24 h by `community.max_clones_per_day` (403 `LIMIT_COMMUNITY_CLONES`). Likes, flat comments (optional `questionIndex`, author toggles `resolvedAt`), one report per teacher. Module `apps/api/src/modules/community`, schemas/DTOs in `packages/shared/src/community`, web hooks in `apps/web/src/lib/community.ts`, pages `/app/community` and `/app/community/[id]`, dialogs in `components/community`. The question list filter accepts `source=` (e.g. `community`).

### Authentication

- Teacher: argon2 password, Google OAuth, or Facebook Login. Both providers implement `OAuthProviderService` (`modules/auth/oauth-profile.ts`) and share `AuthService.loginWithOAuth(provider, profile)` plus the generic `oauthStart`/`oauthCallback` handlers in `auth.controller.ts`; a provider whose env vars are empty is hidden by `GET /auth/providers` and its start route returns 503. Callback failures redirect to `/login?error=<provider>`. Access JWT lasts 15 min in httpOnly cookie `lh_at`; refresh token lasts 30 days, is rotated and stored hashed, in cookie `lh_rt` scoped to path `/api/auth`. A non-httpOnly hint cookie `lh_session` is read by `apps/web/src/proxy.ts` to redirect unauthenticated `/app/*` to `/login`; the real gate is `useMe()` in `app/app/layout.tsx`. Cookie helpers are in `modules/auth/cookies.ts`.
- Teacher profile: `GET/PATCH /teachers/me` (name, phone, school, `levels` thcs|thpt, `subjects`), `POST /auth/password` (lives under `/auth` because the refresh cookie is path-scoped to `/api/auth`; requires the current password when one exists, keeps the calling session and revokes every other refresh token), `POST/DELETE /teachers/me/avatar` (≤2 MB image via `StorageService`). `TeacherDto` carries `hasPassword` and `providers`; the web page is `/app/profile`, reached from the header `AccountMenu`.
- Roster: `Student` has optional `studentCode, dateOfBirth (@db.Date, DTO as YYYY-MM-DD), gender (nam|nu|khac), phone, email, school, parentName, parentPhone, note`; only `name` is required. The Excel template (`GET /classes/:id/students/template.xlsx`, built by `roster-template.ts`) and the importer (`excel-roster.parser.ts`, header detection by Vietnamese/English keywords) share `ROSTER_TEMPLATE_COLUMNS` in `packages/shared/src/roster/template-columns.ts`; headers read "Họ và tên (bắt buộc)" / "… (tùy chọn)". Import always adds rows (dedupe by suffix), never updates. `POST /classes/:id/students` (`createStudentSchema`) adds one student from the web modal through the same `insert()` path (limits, suffix). Web roster tab: toolbar above the full-width table (name/code search with `normalizeText`, sort A→Z, Excel import, template, primary "Thêm học sinh"); `AddStudentsDialog` has two tabs (one student form / paste names) and `StudentDetailDialog` edits; both share `StudentFields` in `components/classes/student-form.tsx`. Rows have no manual reorder arrows anymore (the reorder endpoint stays for sort A→Z). Clicking a name opens the student profile `/app/classes/[id]/students/[studentId]` backed by `GET /classes/:classId/students/:studentId/profile` (`StudentProfileDto`: info, attendance history + per-status summary reusing `SessionsService.studentHistory`, and every finished `QuizRunResult` as `StudentRunHistoryItemDto` with score, percent, rank, participants). It lives in its own `student-profile` module because it needs both `ClassesService` and `SessionsService` (SessionsModule already imports ClassesModule).
- Student: `/join/:code` lists names, picking one creates a `StudentDevice` row and a 180-day device token returned both as cookie and in the body. The web stores it in localStorage and sends `Authorization: Bearer` as a fallback for blocked third-party cookies. When `Class.rosterLocked` is true, a name already bound to another device yields 409 `STUDENT_BOUND`; the teacher can unbind.

### Web

- Route groups: `(auth)` teacher login/signup/reset; `app/` teacher shell (client layout gated by `useMe()`, nav Classes / Questions / Quizzes); `(student)` `/join`, `/join/[code]`, `/s` (mobile-first, no chrome; `/student/me` returns the currently open session and run) served only on the student sub-domain; `(marketing)`. `/present/[sessionId]` is not built yet.
- **Student sub-domain**: `proxy.ts` routes by `Host`. On `NEXT_PUBLIC_STUDENT_ORIGIN` (dev `http://hs.localhost:3000`) `/` rewrites to `/join`, `/<CODE>` rewrites to `/join/<CODE>`, and every teacher route redirects to `/`; on the teacher host `/join*` and `/s` redirect (308) to the student origin. Build join links with `studentJoinUrl()` from `lib/student-origin.ts`, never from `window.location`. The API mirrors this with `STUDENT_APP_URL` (CORS, Socket.IO, QR). Never link to `/join` from marketing or auth pages: students must not discover teacher signup.
- `lib/api.ts` `apiFetch()`: sends cookies, refreshes once on 401 with a single in-flight refresh, throws `ApiError { status, code }`. Each `lib/<domain>.ts` holds TanStack Query hooks plus a `<domain>Keys` query-key factory; mutations `setQueryData` with the returned DTO and invalidate list keys.
- `lib/student.ts`: `studentFetch()` adds the Bearer device token; `useAnswerQueue()` persists unsent answers in localStorage and retries every 2 s and on reconnect, dropping entries that fail with `RUN_NOT_OPEN`.
- `lib/socket.ts` `useSessionSocket(sessionId, auth)` exposes the latest `runState`, `sessionState`, `connected`, `connectCount`, and `offsetMs` (server clock offset used by countdowns). A teacher socket that fails auth triggers one token refresh and reconnect.
- All user-visible text goes through next-intl: `useTranslations('Namespace')` with keys in `messages/vi.json`. Primitives live in `components/ui`; `MarkdownLatex` renders question stems with remark-math + KaTeX. Keep `apps/web`'s `katex` on the same major as the one `rehype-katex` resolves (0.16.x): KaTeX 0.18 renamed CSS classes (`.katex-base`, `.katex-strut`), so a mismatched stylesheet makes fractions and superscripts overlap. The `.md-latex` rules in `globals.css` add line-height and wrapping but never override `.katex` font-size/line-height.
- `apps/web/CLAUDE.md` includes `AGENTS.md`, which `next dev` rewrites: Next.js 16 differs from training data, so read `apps/web/node_modules/next/dist/docs/` before writing Next-specific code.

### UI rules (see `DESIGN.md`)

`DESIGN.md` at the repo root is the design system: tokens in its front matter, rules in the body. `DESIGN-figma.md` is the reference it was adapted from; do not copy from it directly. Before building or restyling any page or component, read `DESIGN.md` and apply these rules:

- **Two contexts, one palette.** Marketing (`/`, `(auth)`) is editorial: ink `#111` on white, pill buttons 48px, mono eyebrows, one pastel color block per section with white canvas between blocks. Product (`app/`, `(student)`, `/present`) is compact: same tokens, buttons `rounded-md` 40px, cards with hairline borders.
- **Primary action is the accent blue** (`bg-accent`, hover `bg-accent-strong`), on marketing, auth and app alike; one filled accent button per viewport, the second action is an outlined pill. Ink black is for text, the wordmark and the active nav pill, never for CTAs. Danger red only for destructive actions, spatially separated from the primary button.
- **Color blocks are bound to features**: lime = quiz/leaderboard, lilac = question bank/AI, cream = attendance, mint = students/join/correct, pink = absent/wrong (never a section), coral = projector, navy = student section and the projector background. Never put two color blocks in one viewport; never add other accent colors, gradients, or glass effects.
- **Eyebrow strings in `vi.json` are sentence case**; `type-eyebrow` uppercases them in CSS.
- **Type**: Be Vietnam Pro 400/500/600/700 (headings 600–700, never light weights: Vietnamese diacritics need it) and JetBrains Mono only for eyebrows, captions, class codes, timers, scores. Use the `type-*` utilities from `globals.css` (`type-display`, `type-h2`, `type-h3`, `type-lead`, `type-body`, `type-eyebrow`, `type-caption`) instead of ad-hoc `text-4xl leading-tight` stacks: headings need line-height 1.15–1.2 and letter-spacing no tighter than -0.01em or diacritics collide; never `text-balance` on long Vietnamese headings. Body ≥16px on mobile, tabular numerals for scores and countdowns, projector stems ≥48px.
- **Tokens live in `apps/web/src/app/globals.css` `@theme`** (`--color-ink`, `--color-accent`, `--color-block-*`, `--font-sans`, `--font-mono`, radii). Components use utility classes; no hex values in JSX. Primitives in `components/ui`, marketing sections in `components/marketing`, quiz views shared through `components/runs`.
- **Imagery**: real Vietnamese classroom photos (AI-generated via Higgsfield, stored as WebP in `apps/web/public/img/`, rendered with `next/image`, hero has `priority`). Students must read as high-school age (16–18, white uniform shirts); mock data uses grade 10–12 classes and questions ("Toán 12A1", derivatives). Rename an image file when replacing it so the Next image cache does not serve the old one. Screens in photos stay blank; real UI is composited with CSS. Icons are lucide-react only, no emoji icons.
- **Motion**: the landing has no looping or scroll-reveal animation; motion is limited to hover/press transitions and tab switches in `components/marketing/showcase.tsx`. If decorative motion is added, at most one looping element per page, paused when the tab is hidden, and client motion components read `usePrefersReducedMotion()`.
- **Accessibility and motion**: contrast ≥4.5:1 on every block, targets ≥44px (students ≥56px), visible labels and focus rings, `aria-live` for live counts, one h1 per page, `min-h-dvh`. Motion only via transform/opacity with 150/200/300/450ms tokens, ease-out in, ease-in out, everything off under `prefers-reduced-motion`.
- Update `DESIGN.md` when a rule changes; UI work that contradicts it is a bug.

### Tests

- Unit tests are vitest `*.spec.ts` files next to the source (vitest globals are on). Shared covers the parser fixtures, grading, roster utils, normalize; api covers tokens, limits, env.
- e2e (`apps/api/test/*.e2e-spec.ts`) boots the full `AppModule` via `createTestApp()` and drives it with supertest. Helpers in `test/helpers.ts`: `signup()` returns a cookie jar, `pickStudent()` returns a student token, `readSetCookies()` / `cookieHeader()` carry cookies between requests. Every test teacher email starts with `e2e-` and `cleanupE2eData()` deletes them (cascading) in `afterAll`. Socket tests call `app.listen(0)` and connect `socket.io-client` to `/rt`.
- Web slices have been verified manually in the browser (Playwright MCP); there are no automated web tests yet.
