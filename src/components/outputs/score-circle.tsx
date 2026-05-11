"use client";

interface ScoreCircleProps {
  label: string;
  score: number | null;
  description?: string;
}

function getStrokeColor(score: number | null, inverted = false): string {
  if (score === null) return "#3f3f46";
  const risk = inverted ? score : 100 - score;
  if (risk < 30) return "#4ade80";
  if (risk <= 70) return "#f59e0b";
  return "#f87171";
}

export function ScoreCircle({ label, score, description }: ScoreCircleProps) {
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const pct = score !== null ? score / 100 : 0;
  const dash = pct * circ;
  const gap = circ - dash;

  const strokeColor = getStrokeColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="8"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          className="transition-all duration-500"
        />
        <text
          x="48"
          y="52"
          textAnchor="middle"
          className="font-mono"
          fill="#e4e4e7"
          fontSize="16"
          fontFamily="monospace"
          fontWeight="bold"
        >
          {score !== null ? score : "—"}
        </text>
      </svg>
      <div className="text-center">
        <div className="text-xs font-medium text-zinc-300">{label}</div>
        {description && (
          <div className="text-xs text-zinc-600 mt-0.5">{description}</div>
        )}
      </div>
    </div>
  );
}
