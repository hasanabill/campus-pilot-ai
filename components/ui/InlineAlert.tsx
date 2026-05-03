type InlineAlertProps = {
  message: string;
  tone?: "error" | "success" | "info" | "warning";
};

const config: Record<
  NonNullable<InlineAlertProps["tone"]>,
  { wrap: string; icon: string }
> = {
  error:   { wrap: "border-red-200    bg-red-50    text-red-800",    icon: "✕" },
  success: { wrap: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "✓" },
  info:    { wrap: "border-sky-200    bg-sky-50    text-sky-800",    icon: "ℹ" },
  warning: { wrap: "border-amber-200  bg-amber-50  text-amber-800",  icon: "⚠" },
};

export default function InlineAlert({ message, tone = "info" }: InlineAlertProps) {
  const { wrap, icon } = config[tone];
  return (
    <p className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm leading-snug ${wrap}`}>
      <span aria-hidden className="shrink-0 font-bold leading-5">{icon}</span>
      <span>{message}</span>
    </p>
  );
}
