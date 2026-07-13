"use client";

interface Point {
  date: string;
  followersCount: number;
}

const LINE_COLOR = "#3987e5";
const WIDTH = 600;
const HEIGHT = 160;
const PAD = { top: 12, right: 48, bottom: 20, left: 8 };

export default function GrowthChart({ data }: { data: Point[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-neutral-500">
        Not enough history yet to plot a trend &mdash; check back after a few more scans.
      </div>
    );
  }

  const values = data.map((d) => d.followersCount);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (i / (data.length - 1)) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - min) / range) * plotH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.followersCount).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${x(data.length - 1).toFixed(1)},${(HEIGHT - PAD.bottom).toFixed(1)} L${PAD.left},${(HEIGHT - PAD.bottom).toFixed(1)} Z`;

  const gridLines = [min, (min + max) / 2, max];
  const last = data[data.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Follower count over time">
      {gridLines.map((g, i) => (
        <line
          key={i}
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={y(g)}
          y2={y(g)}
          stroke="#2c2c2a"
          strokeWidth={1}
        />
      ))}
      {gridLines.map((g, i) => (
        <text key={i} x={WIDTH - PAD.right + 6} y={y(g) + 3} fontSize={10} fill="#898781">
          {Math.round(g).toLocaleString()}
        </text>
      ))}
      <path d={areaPath} fill={LINE_COLOR} opacity={0.1} stroke="none" />
      <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.followersCount)} r={i === data.length - 1 ? 4 : 3} fill={LINE_COLOR} stroke="#171717" strokeWidth={2}>
          <title>
            {new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: {d.followersCount.toLocaleString()} followers
          </title>
        </circle>
      ))}
      <text x={x(data.length - 1) + 8} y={y(last.followersCount) + 4} fontSize={11} fontWeight={600} fill="#ffffff">
        {last.followersCount.toLocaleString()}
      </text>
    </svg>
  );
}
