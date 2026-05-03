type MetricCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "indigo" | "sky" | "emerald" | "amber";
};

const accentMap = {
  default: "border-zinc-200 bg-white",
  indigo:  "border-indigo-100 bg-indigo-50/60",
  sky:     "border-sky-100 bg-sky-50/60",
  emerald: "border-emerald-100 bg-emerald-50/60",
  amber:   "border-amber-100 bg-amber-50/60",
};

const valueAccentMap = {
  default: "text-zinc-900",
  indigo:  "text-indigo-700",
  sky:     "text-sky-700",
  emerald: "text-emerald-700",
  amber:   "text-amber-700",
};

export default function MetricCard({ label, value, hint, accent = "default" }: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm transition hover:shadow-md ${accentMap[accent]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${valueAccentMap[accent]}`}>{value}</p>
      {hint ? <p className="mt-1.5 text-xs text-zinc-400">{hint}</p> : null}
    </div>
  );
}
