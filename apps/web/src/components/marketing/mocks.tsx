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
