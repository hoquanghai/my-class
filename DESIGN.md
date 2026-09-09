---
version: 1.0
name: Lop-Hoc-design-system
description: 'Khung biên tập đen–trắng tự tin (mực đen, giấy trắng, đường kẻ mảnh, nút viên thuốc) được ngắt nhịp bằng những khối màu pastel cỡ lớn — lime cho kiểm tra, lilac cho ngân hàng câu hỏi, cream cho điểm danh, mint cho học sinh, coral cho máy chiếu, navy cho phần tối. Chữ Be Vietnam Pro đậm và rõ vì tiếng Việt có dấu; JetBrains Mono cho nhãn, mã lớp, đồng hồ và điểm số. Nghiêm túc như một công cụ của giáo viên, vui như một tờ giấy nhớ dán trên bảng.'

colors:
  ink: '#111111'
  canvas: '#ffffff'
  surface-soft: '#f7f7f5'
  hairline: '#e6e6e6'
  hairline-soft: '#f1f1f1'
  ink-muted: '#5b5b60'
  inverse-canvas: '#111111'
  inverse-ink: '#ffffff'
  accent: '#2a5bd7'
  on-accent: '#ffffff'
  accent-soft: '#eaf0fd'
  block-lime: '#dceeb1'
  block-lilac: '#c9b8f5'
  block-cream: '#f4ecd6'
  block-mint: '#c8e6cd'
  block-pink: '#efd4d4'
  block-coral: '#f3c9b6'
  block-navy: '#1f1d3d'
  semantic-success: '#1a8f43'
  semantic-warning: '#b45309'
  semantic-danger: '#c62828'
  overlay-scrim: '#111111'

typography:
  display-xl:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.01em
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  title:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  label:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  button:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0
  eyebrow:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.06em
  caption:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.02em
  code-class:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0.2em
  projector-stem:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.01em
  projector-option:
    fontFamily: Be Vietnam Pro
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  projector-timer:
    fontFamily: JetBrains Mono
    fontSize: 72px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 20px
  xl: 28px
  pill: 999px
  full: 9999px

spacing:
  hair: 1px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 64px
  section: 96px

components:
  button-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.inverse-ink}'
    typography: '{typography.button}'
    rounded: '{rounded.pill}'
    padding: 12px 24px
    height: 48px
  button-secondary:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.button}'
    rounded: '{rounded.pill}'
    padding: 12px 22px
    height: 48px
    border: 1px solid {colors.hairline}
  button-inverse:
    backgroundColor: '{colors.inverse-ink}'
    textColor: '{colors.ink}'
    typography: '{typography.button}'
    rounded: '{rounded.pill}'
    padding: 12px 24px
    height: 48px
  button-app-primary:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.inverse-ink}'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 0 16px
    height: 40px
  button-app-secondary:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 0 16px
    height: 40px
    border: 1px solid {colors.hairline}
  button-app-danger:
    backgroundColor: '{colors.semantic-danger}'
    textColor: '{colors.inverse-ink}'
    typography: '{typography.button}'
    rounded: '{rounded.md}'
    padding: 0 16px
    height: 40px
  button-icon-circular:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.ink}'
    rounded: '{rounded.full}'
    size: 40px
  text-input:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px 14px
    height: 48px
    border: 1px solid {colors.hairline}
  text-input-focused:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px 14px
    height: 48px
    border: 1px solid {colors.ink}
    ring: 0 0 0 3px {colors.accent-soft}
  text-input-error:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: 12px 14px
    height: 48px
    border: 1px solid {colors.semantic-danger}
  card:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: 24px
    border: 1px solid {colors.hairline}
  card-soft:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.ink}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.md}'
    padding: 16px
  sticky-note:
    backgroundColor: '{colors.block-cream}'
    textColor: '{colors.ink}'
    typography: '{typography.body-sm}'
    rounded: '{rounded.sm}'
    padding: 16px
    rotate: -2deg
  color-block-lime:
    backgroundColor: '{colors.block-lime}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.xl}'
    padding: 48px
  color-block-lilac:
    backgroundColor: '{colors.block-lilac}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.xl}'
    padding: 48px
  color-block-cream:
    backgroundColor: '{colors.block-cream}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.xl}'
    padding: 48px
  color-block-mint:
    backgroundColor: '{colors.block-mint}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.xl}'
    padding: 48px
  color-block-coral:
    backgroundColor: '{colors.block-coral}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.xl}'
    padding: 48px
  color-block-navy:
    backgroundColor: '{colors.block-navy}'
    textColor: '{colors.inverse-ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.xl}'
    padding: 48px
  status-present:
    backgroundColor: '{colors.block-mint}'
    textColor: '{colors.semantic-success}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
  status-late:
    backgroundColor: '{colors.block-cream}'
    textColor: '{colors.semantic-warning}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
  status-absent:
    backgroundColor: '{colors.block-pink}'
    textColor: '{colors.semantic-danger}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
  status-excused:
    backgroundColor: '{colors.block-lilac}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    rounded: '{rounded.md}'
  answer-option:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.lg}'
    padding: 16px
    border: 2px solid {colors.hairline}
    minHeight: 56px
  answer-option-selected:
    backgroundColor: '{colors.accent-soft}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.lg}'
    padding: 16px
    border: 2px solid {colors.accent}
    minHeight: 56px
  answer-option-correct:
    backgroundColor: '{colors.block-mint}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.lg}'
    padding: 16px
    border: 2px solid {colors.semantic-success}
    minHeight: 56px
  answer-option-wrong:
    backgroundColor: '{colors.block-pink}'
    textColor: '{colors.ink}'
    typography: '{typography.body-lg}'
    rounded: '{rounded.lg}'
    padding: 16px
    border: 2px solid {colors.semantic-danger}
    minHeight: 56px
  class-code-badge:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.inverse-ink}'
    typography: '{typography.code-class}'
    rounded: '{rounded.md}'
    padding: 8px 16px
  top-nav:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    height: 64px
    border: 1px solid {colors.hairline-soft}
  app-shell-nav:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.label}'
    height: 56px
    border: 1px solid {colors.hairline}
  projector-canvas:
    backgroundColor: '{colors.block-navy}'
    textColor: '{colors.inverse-ink}'
    typography: '{typography.projector-stem}'
    padding: 64px
  footer:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.caption}'
    padding: 64px 32px
---

# Hệ thống thiết kế Lớp Học

> Bản này là kết quả phân tích `DESIGN-figma.md` (hệ thống marketing của Figma) và điều chỉnh cho sản phẩm Lớp Học: một công cụ miễn phí cho giáo viên trung tâm luyện thi, học sinh làm bài trên điện thoại, kết quả chiếu lên máy chiếu. Tiếng Việt có dấu, người dùng 12–60 tuổi, thiết bị từ điện thoại giá rẻ tới máy chiếu lớp học.

## 1. Giữ gì, đổi gì so với Figma

| Chủ đề          | Figma                                          | Lớp Học                                                                                       | Lý do                                                                                                                  |
| --------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Khung màu       | Đen tuyệt đối trên trắng, không xám            | Mực `{colors.ink}` #111 trên trắng, có thêm `{colors.ink-muted}` cho chữ phụ                  | Đen tuyệt đối gây chói trên máy chiếu và màn OLED; chữ phụ trong bảng, form của app cần một cấp xám (vẫn đạt 4.5:1)    |
| Khối màu pastel | 7 khối, luân phiên theo trang                  | 6 khối, **mỗi khối gắn với một tính năng cố định** (xem §3)                                   | Người dùng học được "màu = tính năng": lime là kiểm tra, cream là điểm danh… nhất quán từ landing tới app              |
| Nút chính       | Viên thuốc đen                                 | Viên thuốc đen ở marketing; trong app bo góc 12px, cao 40px                                   | Trang marketing cần cảm giác biên tập; app cần mật độ cao, nhiều nút cạnh nhau                                         |
| Màu nhấn        | Magenta dùng một lần                           | Bỏ magenta. Một màu nhấn xanh `{colors.accent}` cho liên kết, focus, trạng thái chọn, tiến độ | App cần màu "tương tác" tách khỏi màu "hành động chính"                                                                |
| Chữ             | figmaSans, độ đậm mảnh 320–340 cho tiêu đề lớn | Be Vietnam Pro 600–700 cho tiêu đề; JetBrains Mono cho nhãn, mã lớp, đồng hồ, điểm            | Chữ mảnh với dấu tiếng Việt mất nét trên điện thoại và máy chiếu. Mono có số dạng bảng, hợp bảng xếp hạng và đếm ngược |
| Phân cấp        | Bằng độ đậm, không đổi cỡ                      | Bằng cả cỡ và độ đậm                                                                          | Dấu tiếng Việt cần khoảng dòng; đổi cỡ giúp đọc nhanh trên lớp                                                         |
| Đổ bóng         | Gần như không                                  | Không bóng ở marketing; app có một mức bóng mềm cho menu, hộp thoại                           | Giữ tinh thần "màu là chiều sâu" nhưng app cần lớp nổi rõ                                                              |
| Màu ngữ nghĩa   | Chỉ có xanh lá cho dấu tick                    | Thêm success / warning / danger, ghép với khối pastel thành chip trạng thái điểm danh         | Điểm danh và chấm bài là nghiệp vụ lõi                                                                                 |
| Chế độ tối      | Không có                                       | Không có cho app; **máy chiếu dùng nền navy**                                                 | Phòng học tắt đèn khi chiếu; nền tối đỡ chói                                                                           |
| Hình ảnh        | Mock sản phẩm phẳng                            | Ảnh lớp học Việt Nam thật (AI tạo), kèm giao diện thật dựng bằng CSS đè lên                   | Ảnh giúp giáo viên nhận ra chính mình; giao diện thật tránh ảnh "màn hình giả" nhòe chữ                                |

## 2. Màu sắc

### Nền và mực

- **Ink** `{colors.ink}` — mọi tiêu đề, thân bài, nút chính. Không dùng #000.
- **Ink muted** `{colors.ink-muted}` — chữ phụ trong app (nhãn cột, thời gian, gợi ý). Tỷ lệ tương phản 6.9:1 trên trắng. Không dùng ở tiêu đề marketing.
- **Canvas** `{colors.canvas}` — nền trang và thẻ.
- **Surface soft** `{colors.surface-soft}` — nền ô mềm, nút tròn, dải "bằng chứng" dưới hero, nền app shell.
- **Hairline** `{colors.hairline}` / **Hairline soft** `{colors.hairline-soft}` — viền input, thẻ, kẻ bảng.

### Màu nhấn tương tác

- **Accent** `{colors.accent}` — liên kết, vòng focus, tab đang chọn, thanh tiến độ, phương án học sinh đang chọn. Tương phản trên trắng 6.2:1.
- **Accent soft** `{colors.accent-soft}` — nền trạng thái chọn và nền vòng focus.
- Không dùng accent làm nền nút hành động chính. Nút chính là mực đen.

### Khối màu gắn với tính năng

| Khối  | Mã                     | Tính năng                             | Nơi dùng                                                    |
| ----- | ---------------------- | ------------------------------------- | ----------------------------------------------------------- |
| Lime  | `{colors.block-lime}`  | Kiểm tra đầu giờ, bảng xếp hạng       | Section landing, nền thẻ "Phát đề", huy hiệu lượt đang chạy |
| Lilac | `{colors.block-lilac}` | Ngân hàng câu hỏi, nhập đề, AI        | Section landing, tab Nhập đề, panel bên trang đăng nhập     |
| Cream | `{colors.block-cream}` | Điểm danh, danh sách lớp              | Section landing, giấy nhớ, chip "muộn"                      |
| Mint  | `{colors.block-mint}`  | Học sinh, vào lớp                     | Section landing, chip "có mặt", phương án đúng              |
| Pink  | `{colors.block-pink}`  | Sai, vắng                             | Chip "vắng", phương án sai. Không dùng làm section          |
| Coral | `{colors.block-coral}` | Máy chiếu, trực tiếp                  | Section landing, nút "Máy chiếu"                            |
| Navy  | `{colors.block-navy}`  | Phần dành cho học sinh, nền máy chiếu | Section tối trên landing, toàn bộ `/present`                |

Quy tắc: một khối màu chiếm trọn chiều rộng nội dung, bo `{rounded.xl}`, đệm `{spacing.xxl}` (mobile `{spacing.lg}`), và **giữa hai khối luôn quay về nền trắng**. Không đặt hai khối màu trong cùng một khung nhìn.

### Màu ngữ nghĩa

- **Success** `{colors.semantic-success}`, **Warning** `{colors.semantic-warning}`, **Danger** `{colors.semantic-danger}`.
- Luôn kèm biểu tượng hoặc chữ; không truyền nghĩa chỉ bằng màu (học sinh mù màu đỏ/lục).
- Chip trạng thái điểm danh = khối pastel + chữ ngữ nghĩa: `{components.status-present}`, `{components.status-late}`, `{components.status-absent}`, `{components.status-excused}`.

## 3. Chữ

### Họ chữ

- **Be Vietnam Pro** (đã nạp qua `next/font`, subset `vietnamese` + `latin`, độ đậm 400/500/600/700). Thiết kế cho tiếng Việt: dấu không chạm dòng trên, chữ "đ" rõ.
- **JetBrains Mono** (subset `vietnamese` + `latin`, 400/500/700). Chỉ dùng cho: eyebrow, caption, mã lớp, đồng hồ đếm ngược, điểm số, số thứ tự câu. Không bao giờ đặt đoạn văn bằng mono.
- Dự phòng: `system-ui, "Segoe UI", Roboto, sans-serif` và `ui-monospace, Consolas, monospace`.

### Thang chữ

| Token                           | Cỡ (desktop / mobile) | Đậm | Dùng cho                                                 |
| ------------------------------- | --------------------- | --- | -------------------------------------------------------- |
| `{typography.display-xl}`       | 56 / 36px             | 700 | Tiêu đề hero landing                                     |
| `{typography.display-lg}`       | 40 / 28px             | 700 | Tiêu đề section, tiêu đề trang đăng nhập                 |
| `{typography.headline}`         | 24 / 22px             | 600 | Tiêu đề trong khối màu, tiêu đề trang app                |
| `{typography.title}`            | 20px                  | 600 | Tiêu đề thẻ, hộp thoại                                   |
| `{typography.body-lg}`          | 18px                  | 400 | Đoạn dẫn hero, thân bài trong khối màu                   |
| `{typography.body}`             | 16px                  | 400 | Thân bài mặc định, input. Không nhỏ hơn 16px trên mobile |
| `{typography.body-sm}`          | 14px                  | 400 | Thẻ, bảng, chú thích trong app                           |
| `{typography.label}`            | 14px                  | 500 | Nhãn form, mục điều hướng, chip                          |
| `{typography.button}`           | 16px                  | 600 | Mọi nút                                                  |
| `{typography.eyebrow}`          | 13px mono, IN HOA     | 500 | Nhãn mở đầu section, nhãn nhóm                           |
| `{typography.caption}`          | 12px mono             | 400 | Thời gian, mã, chân trang                                |
| `{typography.code-class}`       | 32px mono             | 700 | Mã lớp (DEM268)                                          |
| `{typography.projector-stem}`   | 48px (tối thiểu)      | 600 | Đề bài trên máy chiếu                                    |
| `{typography.projector-option}` | 30px                  | 500 | Phương án trên máy chiếu                                 |
| `{typography.projector-timer}`  | 72px mono             | 700 | Đếm ngược trên máy chiếu                                 |

Nguyên tắc: tiêu đề dòng cao 1.15–1.2 (dấu tiếng Việt chiếm thêm chỗ phía trên, 1.05 làm dấu chạm dòng trên), thân bài 1.6. Giãn chữ âm tối đa -0.01em. Không dùng `text-balance` cho tiêu đề tiếng Việt dài vì nó tách cụm từ ("đầu giờ"); dùng `text-wrap: pretty` và giới hạn `max-w-[16ch]`. Chữ mono chỉ ở eyebrow, caption, mã, số; ghi chú dưới nút dùng sans 14px. Các lớp tiện ích `type-display`, `type-h2`, `type-h3`, `type-lead`, `type-body`, `type-eyebrow`, `type-caption` trong `globals.css` là cách duy nhất để đặt cỡ tiêu đề và thân bài; không viết `text-4xl leading-tight` rời rạc. Chữ nhỏ nhất trong app là 12px và chỉ dùng mono caption. Số trong bảng, điểm, đồng hồ luôn `font-variant-numeric: tabular-nums`.

## 4. Bố cục và khoảng cách

- Đơn vị 4px; thang `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.md}` 16 · `{spacing.lg}` 24 · `{spacing.xl}` 32 · `{spacing.xxl}` 48 · `{spacing.xxxl}` 64 · `{spacing.section}` 96.
- Bề rộng nội dung marketing 1200px, app 1152px (`max-w-6xl`), học sinh 448px (`max-w-md`), máy chiếu toàn màn hình.
- Lề trang: 16px mobile, 24px tablet, 32px desktop.
- Khoảng cách giữa các section marketing: `{spacing.section}` desktop, `{spacing.xxxl}` mobile.
- Breakpoint: 375 (điện thoại nhỏ), 768 (tablet), 1024 (laptop), 1280 (desktop).
- Dùng `min-h-dvh` thay `100vh`. Không cuộn ngang. Vùng nội dung rộng (bảng, công thức dài) cuộn trong hộp riêng.

## 5. Hình khối, độ cao

| Token            | Giá trị | Dùng cho                                       |
| ---------------- | ------- | ---------------------------------------------- |
| `{rounded.xs}`   | 4px     | Chip nhỏ, gạch chân liên kết                   |
| `{rounded.sm}`   | 8px     | Giấy nhớ, ô chọn nhỏ, tab                      |
| `{rounded.md}`   | 12px    | Input, nút trong app, thẻ nhỏ, chip trạng thái |
| `{rounded.lg}`   | 20px    | Thẻ marketing, phương án trả lời, hộp thoại    |
| `{rounded.xl}`   | 28px    | Khối màu, khung ảnh hero                       |
| `{rounded.pill}` | 999px   | Nút marketing, nút học sinh cỡ lớn             |
| `{rounded.full}` | 9999px  | Nút biểu tượng tròn, avatar chữ cái            |

| Mức | Cách thể hiện                                      | Dùng cho                             |
| --- | -------------------------------------------------- | ------------------------------------ |
| 0   | Phẳng                                              | Khối màu, hero, nền máy chiếu        |
| 1   | Viền 1px `{colors.hairline}`                       | Thẻ, input, bảng                     |
| 2   | Bóng mềm `0 4px 16px rgba(17,17,17,0.06)`          | Menu thả, giấy nhớ nổi trên khối màu |
| 3   | Bóng `0 12px 40px rgba(17,17,17,0.14)` + scrim 50% | Hộp thoại                            |

Giấy nhớ `{components.sticky-note}` xoay nhẹ −2° đến 2°, dùng để "ghim" một mẩu giao diện thật (bảng xếp hạng, ô điểm danh) lên khối màu. Tối đa hai giấy nhớ trong một section.

## 6. Thành phần

### Nút

- `{components.button-primary}` viên thuốc đen, cao 48px — hành động chính trên marketing và trang xác thực. Mỗi khung nhìn chỉ một nút chính.
- `{components.button-secondary}` viên thuốc trắng viền mảnh — hành động thứ hai ("Đăng nhập", "Học sinh vào lớp").
- `{components.button-inverse}` viên thuốc trắng chữ đen — trên khối navy.
- Trong app: `{components.button-app-primary}` (đen, bo 12px, cao 40px), `{components.button-app-secondary}`, `{components.button-app-danger}` (đỏ, tách xa nút chính), `ghost` (chỉ chữ). Cỡ `sm` 32px chỉ cho hàng bảng.
- Học sinh: nút nộp bài viên thuốc đen cao 56px, toàn bề rộng.
- Trạng thái: hover tối/sáng 6%, pressed scale 0.98, disabled opacity 0.5 + `cursor-not-allowed`, loading giữ nguyên kích thước và hiện spinner.

### Form

- Input `{components.text-input}` cao 48px, nhãn luôn hiện phía trên (không dùng placeholder thay nhãn), gợi ý dưới ô, lỗi màu danger ngay dưới ô kèm `aria-describedby`.
- Focus: viền mực + vòng `{colors.accent-soft}` 3px. Không bao giờ bỏ vòng focus.
- Mật khẩu luôn có nút hiện/ẩn; cho phép dán và trình quản lý mật khẩu (`autocomplete`).
- Validate khi blur hoặc submit, không validate từng phím.

### Thẻ và khối

- `{components.card}` trắng viền mảnh bo 20px (marketing) hoặc 12px (app, qua `card-soft`).
- `{components.color-block-*}` như §2. Bên trong khối: eyebrow mono → headline → body-lg → CTA; ảnh hoặc giấy nhớ chiếm cột còn lại trên desktop, xuống dưới trên mobile.

### Trạng thái điểm danh

Ô điểm danh là nút lớn (tối thiểu 80px cao), nền theo `status-*`, tên đậm, trạng thái chữ nhỏ. Chạm đổi vòng có mặt → muộn → vắng → có phép.

### Phương án trả lời (học sinh và máy chiếu)

`{components.answer-option}` cao tối thiểu 56px, chữ cái A/B/C/D trong ô vuông bo 8px bên trái. Chọn → `answer-option-selected` (viền accent). Công bố → `answer-option-correct` (mint) hoặc `answer-option-wrong` (pink) kèm biểu tượng ✓ / ✕. Trên máy chiếu cùng cấu trúc với chữ `projector-option`.

### Mã lớp

`{components.class-code-badge}` mono 32px giãn chữ 0.2em trên nền mực. Mã lớp luôn xuất hiện cùng đường dẫn vào lớp và nút sao chép.

### Điều hướng

- Marketing `{components.top-nav}` 64px: wordmark trái; nhóm menu (Tính năng, Cách dùng, Học sinh, Hỏi đáp) đặt trong viên thuốc nền `{colors.surface-soft}`, chữ 15px đậm 600, mục đang xem tô nền mực chữ trắng theo vị trí cuộn; phải: "Đăng nhập" (text) + "Dùng thử miễn phí" (primary). Không có liên kết học sinh. Dưới 1024px gộp menu vào nút ☰, giữ nút primary.
- App `{components.app-shell-nav}` 56px: Lớp học, Ngân hàng câu hỏi, Đề kiểm tra; mục đang chọn nền `{colors.accent-soft}` chữ accent.
- Học sinh: không có thanh điều hướng; chỉ tên lớp, tên mình, nút "Thoát" nhỏ.

### Máy chiếu

`{components.projector-canvas}` nền navy, chữ trắng, đề bài ≥48px, đếm ngược mono 72px góc phải trên, phân bố đáp án thanh ngang màu mint khi đúng, bảng xếp hạng tối đa 10 dòng, không có thanh điều hướng, không chuột.

## 7. Hình ảnh và minh họa

- **Ảnh**: lớp học Việt Nam thật, ánh sáng tự nhiên ấm, góc máy ngang tầm mắt, không cười kiểu ảnh stock. Giáo viên 25–45 tuổi, học sinh cấp 2–3 mặc đồng phục hoặc áo thường. Màn hình điện thoại và máy chiếu trong ảnh để trống hoặc sáng nhẹ, **giao diện thật được dựng bằng CSS đè lên**, không để AI vẽ chữ.
- Khung ảnh bo `{rounded.xl}` ở hero, `{rounded.lg}` trong khối màu. Tỷ lệ 16:10 hero, 4:5 cột trong khối màu.
- Xuất WebP, đặt trong `apps/web/public/img/`, dùng `next/image` với `width`/`height` cố định; ảnh hero có `priority`. Ảnh dưới màn hình đầu `loading="lazy"`.
- Video demo (nếu có) 6–8 giây, không tiếng, `muted autoplay loop playsinline`, có poster; tắt khi `prefers-reduced-motion`.
- **Biểu tượng**: lucide-react duy nhất, nét 1.5px, cỡ 16/20/24. Biểu tượng cạnh chữ `aria-hidden`; nút chỉ biểu tượng phải có `aria-label`. Không dùng emoji làm biểu tượng (emoji huy chương trong bảng xếp hạng là ngoại lệ có chủ ý cho học sinh).

## 8. Chuyển động

- Token thời lượng: `fast` 150ms (hover, chip), `base` 200ms (nút, input), `slow` 300ms (hộp thoại, khối màu hiện dần), `reveal` 450ms (danh sách xuất hiện lần lượt, cách nhau 40ms).
- Vào: `ease-out`; ra: `ease-in`, ngắn hơn 30%. Chỉ animate `transform` và `opacity`.
- Landing: mỗi section hiện dần một lần khi cuộn tới (opacity + translateY 16px); phần tử con hiện lần lượt cách nhau 80 ms (`animate-pop` + `animation-delay`).
- Hero là "sân khấu demo" (`components/marketing/hero-demo.tsx`): vòng lặp 6 bước kể lại một buổi học (vào lớp → câu hỏi + đếm ngược → nộp → phân bố đáp án → bảng xếp hạng), mỗi bước 1.3–2.8 s, dừng khi tab ẩn. Đây là phần tử lặp duy nhất được phép trên trang; các section khác chỉ hiện dần một lần.
- Tiêu đề hero có cụm từ xoay vòng (`RotatingWords`, 2.6 s/từ, trượt dọc 500 ms) trên nền lime như bút dạ quang.
- Số liệu đếm lên (`CountUp`) 900 ms ease-out khi cuộn tới, một lần.
- Không parallax, không gradient động, không hiệu ứng theo con trỏ.
- Từ khóa keyframe dùng chung trong `globals.css`: `pop`, `float`, `sparkle`, `pulse-dot`; lớp tiện ích `animate-pop`, `animate-float`, `animate-sparkle`, `animate-pulse-dot`.
- Đếm ngược và thanh tiến độ cập nhật mỗi 200ms bằng `transition: width`.
- `prefers-reduced-motion: reduce` → bỏ mọi chuyển động trang trí, giữ trạng thái cuối: demo hero đứng ở bước cuối, từ xoay vòng giữ từ đầu, số hiện ngay (`usePrefersReducedMotion`).

## 9. Khả năng tiếp cận

- Tương phản chữ ≥ 4.5:1 trên mọi khối màu (ink trên lime 12.9:1, trên lilac 9.6:1, trên navy chữ trắng 14:1). Chữ trên ảnh phải có lớp phủ.
- Mục tiêu chạm ≥ 44×44px, khoảng cách ≥ 8px. Nút học sinh ≥ 56px.
- Thứ tự tab theo thứ tự nhìn; skip link "Tới nội dung chính" ở landing.
- Tiêu đề h1→h2→h3 không nhảy cấp; mỗi trang một h1.
- Vùng `aria-live="polite"` cho số học sinh đã trả lời và kết quả nộp bài.
- Ảnh có `alt` mô tả; ảnh trang trí `alt=""`.

## 10. Nên và không nên

**Nên**

- Mở đầu section bằng eyebrow mono in hoa, rồi tiêu đề, rồi thân bài.
- Chọn **một** khối màu theo tính năng của section, để trang quay về trắng trước khối tiếp theo.
- Dùng mực đen cho nút chính, accent cho liên kết và trạng thái chọn.
- Đưa mã lớp và đường dẫn vào lớp vào mọi màn hình chờ (lobby, máy chiếu).
- Viết chữ tiếng Việt có dấu, câu ngắn, động từ ở đầu nút ("Phát đề", "Nộp").

**Không nên**

- Không dùng xám nhạt cho thân bài marketing; không dùng chữ nhỏ hơn 16px trên mobile.
- Không thêm màu nhấn mới ngoài accent và các khối đã liệt kê. Không gradient, không glassmorphism.
- Không bóng đổ cho khối màu. Không hai khối màu trong một khung nhìn.
- Không nút vuông góc trên marketing; không nút viên thuốc trong bảng của app.
- Không để AI vẽ chữ hoặc giao diện trong ảnh.
- Không dùng emoji thay biểu tượng, không dùng mono cho đoạn văn.

## 11. Hướng dẫn triển khai trong mã

- Token khai báo một lần trong `apps/web/src/app/globals.css` bằng `@theme` của Tailwind 4: `--color-ink`, `--color-accent`, `--color-block-lime`…, `--font-sans`, `--font-mono`, và bo góc theo vai trò `--radius-field` (12px), `--radius-card` (20px), `--radius-block` (28px) để không đụng thang `rounded-*` mặc định mà app đang dùng. Thành phần chỉ dùng lớp tiện ích (`bg-block-lime`, `text-ink`, `rounded-card`), không viết mã hex trong JSX. Bí danh `brand-*` cũ trỏ về accent cho tới khi app shell được chuyển đổi (mục 12, bước 4).
- Chữ nạp qua `next/font/google`: Be Vietnam Pro và JetBrains Mono, đều có subset `vietnamese`, `display: swap`.
- Thành phần gốc trong `apps/web/src/components/ui`; biến thể qua prop (`variant`, `size`), không sao chép lớp Tailwind giữa các trang.
- Marketing dùng `components/marketing/*` (TopNav, Hero, ColorBlock, StickyNote, Footer). Học sinh và máy chiếu dùng `components/runs/*` chung để cùng một câu hỏi hiển thị giống nhau ở ba nơi.
- Kiểm tra trước khi giao: 375px và 1280px, bàn phím Tab qua mọi nút, `prefers-reduced-motion`, tương phản trên từng khối màu.

## 12. Thứ tự áp dụng

1. Token + font trong `globals.css` và `layout.tsx` (ảnh hưởng mọi trang, không đổi bố cục).
2. Landing `/` và nhóm `(auth)` (đăng nhập, đăng ký, quên/đặt lại mật khẩu) theo hệ marketing.
3. Trang học sinh `/join`, `/s` (nút viên thuốc lớn, phương án trả lời theo §6).
4. App shell và các trang giáo viên: nút chính chuyển sang mực đen, tab đang chọn accent, chip điểm danh theo `status-*`.
5. Máy chiếu `/present` (S5) dựng thẳng trên `projector-*`.
