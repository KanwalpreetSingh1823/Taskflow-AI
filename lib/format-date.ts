import { format, formatDistanceToNow, isPast, isToday } from "date-fns";

export function formatDue(iso: string | null | undefined) {
  if (!iso) return "No due date";
  const d = new Date(iso);
  if (isToday(d)) return `Today · ${format(d, "HH:mm")}`;
  return format(d, "MMM d, yyyy");
}

export function relativeTime(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function isOverdue(iso: string | null | undefined, status: string) {
  if (!iso || status === "COMPLETED") return false;
  return isPast(new Date(iso));
}
