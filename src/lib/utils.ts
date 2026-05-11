import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createHash, randomBytes } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateApiKey(): string {
  return `sk_live_${randomBytes(32).toString("hex")}`;
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function truncate(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

export function scoreColor(score: number): string {
  if (score < 30) return "text-green-400";
  if (score <= 70) return "text-amber-400";
  return "text-red-400";
}

export function scoreBg(score: number): string {
  if (score < 30) return "bg-green-900/40";
  if (score <= 70) return "bg-amber-900/40";
  return "bg-red-900/40";
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "PASS":
      return "bg-green-900 text-green-400";
    case "WARN":
      return "bg-amber-900 text-amber-400";
    case "FAIL":
      return "bg-red-900 text-red-400";
    default:
      return "bg-zinc-800 text-zinc-400";
  }
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function heatmapColor(score: number | null): string {
  if (score === null) return "bg-zinc-800";
  if (score < 30) return "bg-green-700";
  if (score <= 70) return "bg-amber-600";
  return "bg-red-700";
}
