/**
 * Dải chữ chạy ngang trên nền mực (DESIGN.md §8): nội dung nhân đôi để lặp liền mạch,
 * dừng khi rê chuột, và đứng yên khi người dùng bật giảm chuyển động.
 */
export function Ticker({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul
      aria-hidden={hidden}
      className="flex shrink-0 items-center gap-8 pr-8 type-eyebrow text-[12px] text-white/90"
    >
      {items.map((item) => (
        <li key={item} className="flex items-center gap-8 whitespace-nowrap">
          {item}
          <span className="size-1.5 rounded-full bg-block-lime" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="group overflow-hidden bg-ink py-3" role="region" aria-label="Tính năng nổi bật">
      <div className="flex w-max animate-ticker group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
