type StatusTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

const toneClassMap: Record<StatusTone, string> = {
  default: "border-zinc-200  bg-zinc-100   text-zinc-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200  bg-amber-50   text-amber-700",
  danger:  "border-red-200    bg-red-50     text-red-700",
  info:    "border-sky-200    bg-sky-50     text-sky-700",
  muted:   "border-zinc-200   bg-zinc-50    text-zinc-400",
};

function toneFromStatus(status: string): StatusTone {
  const value = status.toLowerCase();
  if (["approved", "completed", "published", "active", "resolved"].includes(value)) return "success";
  if (["pending", "in_review", "draft", "updated", "open"].includes(value))          return "warning";
  if (["rejected", "cancelled", "critical", "overdue"].includes(value))              return "danger";
  if (["escalated", "info", "warning"].includes(value))                              return "info";
  if (["muted", "read", "reviewed"].includes(value))                                 return "muted";
  return "default";
}

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

export default function StatusBadge({ label, tone }: StatusBadgeProps) {
  const resolvedTone = tone ?? toneFromStatus(label);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize leading-none ${toneClassMap[resolvedTone]}`}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}
