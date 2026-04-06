type InlineAlertProps = {
  message: string;
  tone?: "error" | "success" | "info" | "warning";
};

const toneClassMap: Record<NonNullable<InlineAlertProps["tone"]>, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
};

export default function InlineAlert({ message, tone = "info" }: InlineAlertProps) {
  return (
    <p className={`rounded-md border px-3 py-2 text-sm ${toneClassMap[tone]}`}>
      {message}
    </p>
  );
}
