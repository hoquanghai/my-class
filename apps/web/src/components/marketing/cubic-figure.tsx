/**
 * Đồ thị y = x³ − 3x² + 2 và tiếp tuyến tại x = 1 (hệ số góc f'(1) = −3), vẽ bằng SVG
 * để câu hỏi đạo hàm trong mock có hình minh họa thật. Chỉ dùng transform tọa độ tuyến tính.
 */
const X_MIN = -1.3;
const X_MAX = 3.3;
const Y_MIN = -3.2;
const Y_MAX = 3.2;
const W = 240;
const H = 150;

const sx = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
const sy = (y: number) => H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * H;
const f = (x: number) => x ** 3 - 3 * x ** 2 + 2;

const CURVE = Array.from({ length: 61 }, (_, i) => {
  const x = X_MIN + ((X_MAX - X_MIN) * i) / 60;
  return `${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(Math.max(Y_MIN, Math.min(Y_MAX, f(x)))).toFixed(1)}`;
}).join(' ');

// Tiếp tuyến tại (1, 0): y = −3(x − 1)
const T1 = { x: 0.1, y: -3 * (0.1 - 1) };
const T2 = { x: 1.9, y: -3 * (1.9 - 1) };

export function CubicFigure({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label="Đồ thị hàm số y = x³ − 3x² + 2 và tiếp tuyến tại điểm có hoành độ 1"
    >
      {/* trục */}
      <line x1={0} y1={sy(0)} x2={W} y2={sy(0)} stroke="currentColor" strokeOpacity={0.25} />
      <line x1={sx(0)} y1={0} x2={sx(0)} y2={H} stroke="currentColor" strokeOpacity={0.25} />
      {[-1, 1, 2, 3].map((x) => (
        <g key={x}>
          <line
            x1={sx(x)}
            y1={sy(0) - 3}
            x2={sx(x)}
            y2={sy(0) + 3}
            stroke="currentColor"
            strokeOpacity={0.4}
          />
          <text
            x={sx(x)}
            y={sy(0) + 12}
            textAnchor="middle"
            fontSize={8}
            fill="currentColor"
            fillOpacity={0.6}
          >
            {x}
          </text>
        </g>
      ))}
      {/* tiếp tuyến */}
      <line
        x1={sx(T1.x)}
        y1={sy(T1.y)}
        x2={sx(T2.x)}
        y2={sy(T2.y)}
        stroke="var(--color-accent)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      {/* đường cong */}
      <path d={CURVE} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
      {/* điểm tiếp xúc */}
      <circle cx={sx(1)} cy={sy(0)} r={3.5} fill="var(--color-accent)" />
      <text x={sx(1) + 6} y={sy(0) - 6} fontSize={8} fill="var(--color-accent)">
        (1; 0)
      </text>
    </svg>
  );
}
