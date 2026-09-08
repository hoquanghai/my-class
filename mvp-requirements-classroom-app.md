# MVP Requirements — Classroom Check-in App (working name: TBD)

## 1. Goal
Ship a free web app for Vietnamese teachers (primary target: tutoring-center teachers) with 6 modules:
1. Classes & rosters
2. Attendance
3. Question bank (fast import)
4. Start-of-class check (kiểm tra đầu giờ)
5. Projector mode
6. Basic teacher reports

MVP purpose is traffic + teacher feedback, not revenue. Everything is free with soft limits. Architecture must not block later additions: parent reports, center-owner role, multi-teacher, fee management, student accounts.

## 2. Users & auth
- **Teacher** — sign up / login via Google, Facebook, or email+password (email verification, password reset). One teacher record regardless of provider (link by verified email).
- **Student** — NO account in MVP. Joins via class code/QR → picks own name from roster. Device remembered via signed token (cookie + localStorage). Teacher can unbind a device or "lock roster" so names already bound cannot be picked from another device.
- Schema must already include `student.student_code` (nullable) and `class.require_student_code` (bool) so per-student codes / accounts can be enabled later without migration pain.

## 3. Modules

### 3.1 Classes & rosters
- Create class: name, subject, grade, optional weekly schedule.
- Roster: paste names (one per line) or import Excel (name column, optional parent phone stored but unused). Edit/remove/reorder. Duplicate names auto-suffixed.
- Class code: 6 chars, no ambiguous characters, regenerable. QR image downloadable/printable.

### 3.2 Attendance
- Start session → roster as tappable tiles: Present / Absent / Late / Excused. Default Present. Bulk mark, undo, per-student note.
- Session list with summary; per-student attendance history.

### 3.3 Question bank
Questions are independent of quizzes (one question → many quizzes). Fields: type (single choice, multiple choice, true/false, short text), stem, options, correct answer(s), explanation (optional), image (optional), tags: subject, grade, chapter/topic, difficulty (nhận biết / thông hiểu / vận dụng), `source` (paste | docx | image_ai | manual).
Content stored as Markdown with inline LaTeX (`$...$`); images on object storage.

Three input paths, all landing on the same **preview-and-fix grid** (parsed questions in a table; unparseable rows highlighted; inline edit; select correct answer by click; Save all):

**a) Paste text / import .docx (rule-based parser, no AI cost)**
- Detect question markers: `Câu 1`, `1.`, `1)`, `Bài 1`.
- Detect options: `A.` `A)` `a.` on same line or separate lines.
- Detect answers: answer table at end (`1B 2C 3A`, `1-B`, `Câu 1: B`), bold/underlined option in .docx XML, or `*` marker.
- Strip headers/footers, "Họ và tên", "Mã đề", page numbers.
- Preserve images from .docx and attach to the nearest question.

**b) Photo / PDF → AI extraction**
- Upload 1–10 images or a PDF (max 20 pages). Send pages to a vision LLM with a strict JSON schema; return questions, options, answers if present, LaTeX for formulas, crop boxes for figures.
- Free limit: 20 pages/month per teacher (feature flag). Show remaining quota.
- Always goes through the preview grid — never auto-save.

**c) Manual editor (keyboard-first)**
- Single text area per question: type stem, Enter → next option, Tab → next question, `Ctrl+Enter` marks correct. Paste image from clipboard. LaTeX renders live.

**Quiz builder**
- Quiz = ordered questions + per-question time limit (default 30s) + points.
- Quick build: filter by tags → "random N questions" → save as quiz. Also manual pick.
- Quizzes reusable across classes.

### 3.4 Start-of-class check
- Launch a quiz into an active session. Modes: **Paced** (teacher advances each question) or **Self-paced** (all open, global deadline).
- Option toggles: shuffle questions, shuffle options.
- Student flow: QR/code → pick name → answer → own score at end.
- Auto grading; short text matched case- and diacritic-insensitive; teacher can override.
- Results saved per student per session.

### 3.5 Projector mode
- Route `/present/:sessionId`, no app chrome, large type, dark background, 720p-safe.
- Screens: lobby (QR + code + joined names/count) → live question with answer counter → per-question result (distribution bars, correct highlighted, who got it right) → final leaderboard (top N + full list toggle).
- Controlled from teacher's phone/laptop via WebSocket. Reconnect-safe; refresh restores state.

### 3.6 Basic reports
- Per session: attendance + quiz score table.
- Per class: per-student score trend (last 10 sessions), attendance rate.
- Free tier: 30-day history, export disabled (feature flags) — UI shows locked buttons with a short "coming soon / gói Trung tâm" note.

## 4. Free-tier limits (all via feature flags, no deploy to change)
- Max 2 classes, 50 students/class.
- Question bank unlimited; AI extraction 20 pages/month.
- History 30 days; export off.
- Attendance, quizzes, projector: unlimited.

## 5. Non-functional
- Web/PWA only. Student UI mobile-first; teacher dashboard & projector desktop-first. Vietnamese UI (i18n scaffold, vi only).
- Realtime: Socket.IO with Redis adapter.
- Load target: 50 concurrent quizzes × 45 students, all submitting within 5s. Projector update < 1s.
- Resilience: student network drop (retry queue), duplicate names, projector refresh.

## 6. Instrumentation & feedback (mandatory)
- Events: signup, class_created, roster_size, session_started, quiz_launched, students_joined, quiz_completed, projector_opened, question_import{source}, export_clicked(locked).
- Feedback prompt (1-tap rating + free text) after teacher ends a session.
- Landing page: 60s demo placeholder, "Dùng thử miễn phí", Zalo/Facebook contact.

## 7. Data & compliance
- Student data = child data. Store name, class, attendance, scores only.
- Privacy policy + terms; teacher accepts at signup and is reminded in roster UI that roster consent is their responsibility.
- Host in Vietnam or Singapore; document region.
- Soft delete; teacher-initiated hard delete of class cascades.

## 8. Tech stack
- Backend: NestJS (TypeScript), PostgreSQL (Prisma), Redis. Frontend: Next.js App Router, Tailwind, PWA.
- Auth: Google + Facebook OAuth, email/password; JWT for teachers; signed device token for students.
- Storage: Cloudflare R2. Docx parsing: mammoth/docx XML. Excel: exceljs. AI extraction: provider-agnostic adapter (Claude / OpenAI), JSON-schema output.
- Deploy: Docker Compose on one VPS, Caddy TLS, GitHub Actions CI.

## 9. Non-goals for MVP
Homework, parent notifications (Zalo/ZNS), fees, center-owner role, multi-teacher, AI question generation, native apps, payments, shared/public question bank.

## 10. Deliverables
1. Monorepo (`apps/api`, `apps/web`, `packages/shared`). 2. Schema + migrations + seed (demo class, demo quiz). 3. End-to-end: signup → class → roster → attendance → import questions (paste + docx + image) → quiz → projector → report. 4. Load test script. 5. README (local, deploy, env).

## 11. Working method
- Propose schema and module breakdown first; wait for approval before implementing.
- Log progress step by step; never run silently on long tasks.
- Vertical slices in order: auth + class + roster → attendance → question bank (paste/docx parser first, editor, then AI image) → quiz + student join → projector → reports → instrumentation + landing.
