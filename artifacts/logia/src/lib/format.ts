export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0m";
  const totalSec = Math.floor(ms / 1000);
  const hr = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (hr > 0) return `${hr}h ${min}m`;
  if (min > 0) return `${min}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}

export function formatClock(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function formatRelativeDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

export function formatExcitement(x: number): string {
  return `${Math.round(x * 100)}%`;
}
