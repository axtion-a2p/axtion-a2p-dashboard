// Minimal dependency-free SVG donut — one chart, one use, not worth a charting
// library. Status colors follow the same emerald/amber/red/neutral convention
// as src/lib/status.ts (good/warning/critical/unknown), and every slice is
// also direct-labeled below the chart so identity never depends on color alone.

export type DonutSlice = { key: string; label: string; value: number; colorClass: string };

const SIZE = 160;
const RADIUS = 60;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-neutral-200" />
        </svg>
        <p className="text-sm text-neutral-400">No events in this range.</p>
      </div>
    );
  }

  const center = SIZE / 2;

  // Precompute each slice's cumulative starting offset with reduce (no
  // variable reassignment inside a closure) — React Compiler's immutability
  // check flags mutating an outer variable from within a render-time callback.
  const arcs = slices.reduce<Array<(typeof slices)[number] & { dash: number; offset: number }>>((acc, s) => {
    const priorTotal = acc.reduce((sum, a) => sum + a.value, 0);
    const dash = (s.value / total) * CIRCUMFERENCE;
    const offset = -((priorTotal / total) * CIRCUMFERENCE);
    return [...acc, { ...s, dash, offset }];
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Delivery status breakdown">
        <g transform={`rotate(-90 ${center} ${center})`}>
          {arcs.map((s) =>
            s.value === 0 ? null : (
              <circle
                key={s.key}
                cx={center}
                cy={center}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeDasharray={`${s.dash} ${CIRCUMFERENCE - s.dash}`}
                strokeDashoffset={s.offset}
                className={s.colorClass}
              />
            )
          )}
        </g>
        <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" className="fill-neutral-900 text-lg font-semibold">
          {total}
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${s.colorClass.replace("stroke-", "bg-")}`} aria-hidden />
            <span className="text-neutral-600">{s.label}</span>
            <span className="font-medium text-neutral-900">{s.value}</span>
            <span className="text-neutral-400">({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
