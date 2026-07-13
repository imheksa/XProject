"use client";

const WIDTH = 200;
const HEIGHT = 40;

export default function MiniSparkline({ data, color = "#3987e5" }: { data: number[]; color?: string }) {
  if (data.length < 2) {
    return <div className="h-10" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => [
    (i / (data.length - 1)) * WIDTH,
    HEIGHT - 4 - ((v - min) / range) * (HEIGHT - 8),
  ]);
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-10 w-full" preserveAspectRatio="none" role="presentation">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3} fill={color} stroke="#171717" strokeWidth={1.5} />
    </svg>
  );
}
