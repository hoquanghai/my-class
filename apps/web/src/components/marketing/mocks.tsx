import { Check, Copy, X } from 'lucide-react';
import { cn } from '@/components/ui/cn';

/*
 * Mẩu giao diện thật dựng bằng CSS để ghim lên ảnh và khối màu (DESIGN.md §7):
 * không để AI vẽ chữ trong ảnh, giao diện luôn khớp sản phẩm.
 */

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardMock({
  rows = [
    ['Nguyễn Văn An', 9],
    ['Trần Thị Bình', 8],
    ['Lê Minh Châu', 8],
    ['Phạm Gia Hân', 7],
  ] as [string, number][],
  total = 10,
  className,
}: {
  rows?: [string, number][];
  total?: number;
  className?: string;
}) {
  return (
    <div className={cn('text-sm', className)}>
      <p className="type-eyebrow mb-2 text-[11px]">Bảng xếp hạng</p>
      <ol className="space-y-1">
        {rows.map(([name, score], i) => (
          <li key={name} className="flex items-center gap-2">
            <span className="w-5 text-center">{i < 3 ? MEDALS[i] : i + 1}</span>
            <span className="flex-1 truncate font-medium">{name}</span>
            <span className="tabular font-mono text-xs">
              {score}/{total}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

type Status = 'present' | 'late' | 'absent' | 'excused';
const STATUS: Record<Status, { label: string; cls: string }> = {
  present: { label: 'Có mặt', cls: 'bg-block-mint text-success' },
  late: { label: 'Muộn', cls: 'bg-block-cream text-warning' },
  absent: { label: 'Vắng', cls: 'bg-block-pink text-danger' },
  excused: { label: 'Có phép', cls: 'bg-block-lilac text-ink' },
};

export function AttendanceMock({ className }: { className?: string }) {
  const tiles: [string, Status][] = [
    ['An', 'present'],
    ['Bình', 'present'],
    ['Châu', 'late'],
    ['Dũng', 'present'],
    ['Hân', 'absent'],
    ['Khoa', 'present'],
    ['Linh', 'excused'],
    ['My', 'present'],
    ['Nam', 'present'],
  ];
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {tiles.map(([name, s]) => (
        <div
          key={name}
          className={cn(
            'flex min-h-16 flex-col justify-between rounded-field p-2.5',
            STATUS[s].cls,
          )}
        >
          <span className="text-sm font-semibold text-ink">{name}</span>
          <span className="text-[11px] font-medium uppercase tracking-wide">{STATUS[s].label}</span>
        </div>
      ))}
    </div>
  );
}

/** Khung điện thoại với một câu hỏi đang mở, phương án B đã chọn. */
export function PhoneQuizMock({
  revealed = false,
  className,
}: {
  revealed?: boolean;
  className?: string;
}) {
  const options = [
    ['A', '3'],
    ['B', '4'],
    ['C', '5'],
    ['D', '6'],
  ];
  return (
    <div
      className={cn(
        'mx-auto w-[260px] rounded-[36px] border-[6px] border-ink bg-canvas p-4 shadow-modal',
        className,
      )}
      aria-hidden="true"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="type-eyebrow text-[11px] text-ink-muted">Câu 3/10</span>
        <span className="tabular rounded-md bg-ink px-2 py-0.5 font-mono text-xs font-bold text-white">
          0:18
        </span>
      </div>
      <p className="mb-3 text-[15px] font-semibold leading-snug">
        Nghiệm của phương trình 2x + 3 = 11 là
      </p>
      <ul className="space-y-2">
        {options.map(([label, text]) => {
          const selected = label === 'B';
          const correct = revealed && label === 'B';
          return (
            <li
              key={label}
              className={cn(
                'flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm',
                correct
                  ? 'border-success bg-block-mint'
                  : selected
                    ? 'border-accent bg-accent-soft'
                    : 'border-hairline',
              )}
            >
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-lg text-xs font-bold',
                  correct
                    ? 'bg-success text-white'
                    : selected
                      ? 'bg-accent text-white'
                      : 'bg-surface-soft text-ink',
                )}
              >
                {label}
              </span>
              <span className="flex-1">x = {text}</span>
              {correct && <Check className="size-4 text-success" />}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 h-11 rounded-full bg-ink text-center text-sm font-semibold leading-[44px] text-white">
        Nộp
      </div>
    </div>
  );
}

/** Lưới câu hỏi vừa nhận diện từ đề: xanh là đã có đáp án, đỏ là cần sửa. */
export function ImportGridMock({ className }: { className?: string }) {
  const cells = [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0];
  return (
    <div className={cn('text-sm', className)}>
      <p className="type-eyebrow mb-2 text-[11px]">Nhận diện 12 câu · 2 cần xem lại</p>
      <div className="grid grid-cols-6 gap-1.5">
        {cells.map((ok, i) => (
          <span
            key={i}
            className={cn(
              'flex h-8 items-center justify-center rounded-md text-xs font-semibold',
              ok ? 'bg-block-mint text-success' : 'bg-block-pink text-danger',
            )}
          >
            {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ClassCodeMock({
  code = 'AB12CD',
  className,
}: {
  code?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 rounded-field bg-ink px-4 py-2 text-white',
        className,
      )}
    >
      <span className="font-mono text-2xl font-bold tracking-[0.2em] sm:text-3xl">{code}</span>
      <Copy className="size-4 opacity-70" aria-hidden="true" />
    </div>
  );
}
