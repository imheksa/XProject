"use client";

interface Point {
  date: string;
  value: number;
}

const WIDTH = 600;
const HEIGHT = 180;
const PAD = { top: 12, right: 48, bottom: 20, left: 8 };
const YOU_COLOR = "#3987e5";
const COMPETITOR_COLOR = "#e66767";

export default function CompareGrowthChart({
  you,
  competitor,
  youLabel,
  competitorLabel,
}: {
  you: Point[];
  competitor: Point[];
  youLabel: string;
  competitorLabel: string;
}) {
  const n = Math.min(you.length, competitor.length);
  if (n < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
        Not enough history yet to compare &mdash; check back after a few more scans.
      </div>
    );
  }

  const youSlice = you.slice(0, n);
  const compSlice = competitor.slice(0, n);
  const allValues = [...youSlice.map((p) => p.value), ...compSlice.map((p) => p.value)];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / (n - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - min) / range) * plotH;

  const pathFor = (series: Point[]) =>
    series.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const gridLines = [min, (min + max) / 2, max];

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Follower growth comparison">
        {gridLines.map((g, i) => (
          <line key={i} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(g)} y2={y(g)} stroke="#2c2c2a" strokeWidth={1} />
        ))}
        {gridLines.map((g, i) => (
          <text key={i} x={WIDTH - PAD.right + 6} y={y(g) + 3} fontSize={10} fill="#898781">
            {Math.round(g).toLocaleString()}
          </text>
        ))}
        <path d={pathFor(compSlice)} fill="none" stroke={COMPETITOR_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={pathFor(youSlice)} fill="none" stroke={YOU_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: YOU_COLOR }} />
          {youLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COMPETITOR_COLOR }} />
          {competitorLabel}
        </span>
      </div>
    </div>
  );
}
