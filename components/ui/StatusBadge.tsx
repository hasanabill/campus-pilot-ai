type StatusTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

const toneClassMap: Record<StatusTone, string> = {
  default: "border-zinc-300 bg-zinc-100 text-zinc-700",
  success: "border-emerald-300 bg-emerald-50 text-emerald-700",
  warning: "border-amber-300 bg-amber-50 text-amber-700",
  danger: "border-red-300 bg-red-50 text-red-700",
  info: "border-sky-300 bg-sky-50 text-sky-700",
  muted: "border-zinc-200 bg-zinc-50 text-zinc-500",
};

function toneFromStatus(status: string): StatusTone {
  const value = status.toLowerCase();
  if (["approved", "completed", "published"].includes(value)) return "success";
  if (["pending", "in_review", "draft", "updated"].includes(value))
    return "warning";
  if (["rejected", "cancelled", "critical"].includes(value)) return "danger";
  if (["escalated", "info"].includes(value)) return "info";
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
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${toneClassMap[resolvedTone]}`}
    >
      {label.replaceAll("_", " ")}
    </span>
  );
}
