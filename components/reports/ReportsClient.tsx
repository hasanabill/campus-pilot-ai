"use client";

import { useEffect, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import MetricCard from "@/components/ui/MetricCard";
import PageHeader from "@/components/ui/PageHeader";

type ReportSummary = {
  period: { start: string; end: string };
  ticket_stats: {
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
  };
  ai_query_stats: {
    total_queries: number;
    unique_users: number;
    routed_to_ticket: number;
    avg_confidence_score: number;
  };
  request_completion: {
    completed: number;
    completion_rate_percent: number;
  };
};

type BusyAction = "refresh" | "generate" | "export" | null;

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toIsoStart(value?: string): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function toIsoEnd(value?: string): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function topEntries(map: Record<string, number>, max = 4) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
}

export default function ReportsClient() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [periodStart, setPeriodStart] = useState(() =>
    toDateInputValue(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)),
  );
  const [periodEnd, setPeriodEnd] = useState(() => toDateInputValue(new Date()));

  function summaryQueryString() {
    const query = new URLSearchParams();
    const startIso = toIsoStart(periodStart);
    const endIso = toIsoEnd(periodEnd);
    if (startIso) query.set("period_start", startIso);
    if (endIso) query.set("period_end", endIso);
    return query.toString();
  }

  async function loadSummary(action: BusyAction = "refresh") {
    setLoading(true);
    setError(null);
    setBusyAction(action);
    try {
      const query = summaryQueryString();
      const response = await fetch(`/api/reports/summary${query ? `?${query}` : ""}`);
      const payload = (await response.json()) as { summary?: ReportSummary; error?: string };
      if (!response.ok || !payload.summary) {
        throw new Error(payload.error ?? "Failed to load report summary.");
      }
      setSummary(payload.summary);
    } catch (loadError) {
      const msg = loadError instanceof Error ? loadError.message : "Failed to load report summary.";
      setError(msg);
    } finally {
      setLoading(false);
      setBusyAction(null);
    }
  }

  async function generateSnapshot() {
    setMessage(null);
    setError(null);
    setBusyAction("generate");
    try {
      const body: Record<string, string> = {};
      const startIso = toIsoStart(periodStart);
      const endIso = toIsoEnd(periodEnd);
      if (startIso) body.period_start = startIso;
      if (endIso) body.period_end = endIso;

      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate report snapshot.");
      }
      setMessage("Report snapshot generated and stored.");
      await loadSummary(null);
    } catch (generateError) {
      const msg =
        generateError instanceof Error ? generateError.message : "Failed to generate report.";
      setError(msg);
    } finally {
      setBusyAction(null);
    }
  }

  function exportCsv() {
    setError(null);
    setBusyAction("export");
    const query = summaryQueryString();
    const url = `/api/reports/export${query ? `?${query}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setMessage("CSV export started in a new tab.");
    setTimeout(() => setBusyAction(null), 500);
  }

  useEffect(() => {
    void loadSummary("refresh");
  }, [periodStart, periodEnd]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Track performance metrics, generate snapshots, and export filtered summaries."
          actions={
            <>
              <button
                onClick={() => void loadSummary("refresh")}
                disabled={busyAction !== null}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === "refresh" ? "Refreshing..." : "Refresh"}
              </button>
              <button
                onClick={() => void generateSnapshot()}
                disabled={busyAction !== null}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === "generate" ? "Generating..." : "Generate Snapshot"}
              </button>
              <button
                onClick={exportCsv}
                disabled={busyAction !== null}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyAction === "export" ? "Exporting..." : "Export CSV"}
              </button>
            </>
          }
        />

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Period Start
            </span>
            <input
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Period End
            </span>
            <input
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {error ? <InlineAlert tone="error" message={error} /> : null}
        {message ? <InlineAlert tone="success" message={message} /> : null}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-lg border border-zinc-200 p-4">
                <div className="h-4 w-28 animate-pulse rounded bg-zinc-200" />
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-zinc-200" />
              </div>
            ))}
          </div>
        ) : null}

        {summary && !loading ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Ticket Statistics"
                value={summary.ticket_stats.total}
                hint="Total tickets in selected period"
              />
              <MetricCard
                label="AI Query Statistics"
                value={summary.ai_query_stats.total_queries}
                hint="Total chatbot queries"
              />
              <MetricCard
                label="Completed Requests"
                value={summary.request_completion.completed}
                hint="Requests with completed status"
              />
              <MetricCard
                label="Completion Rate"
                value={`${summary.request_completion.completion_rate_percent}%`}
                hint="Completed / total request ratio"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 p-4">
                <h3 className="text-sm font-semibold text-zinc-900">Ticket Status Breakdown</h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                  {topEntries(summary.ticket_stats.by_status).map(([key, count]) => (
                    <li key={key} className="flex items-center justify-between">
                      <span className="capitalize">{key.replaceAll("_", " ")}</span>
                      <span className="font-medium text-zinc-900">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-zinc-200 p-4">
                <h3 className="text-sm font-semibold text-zinc-900">Ticket Type Breakdown</h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-700">
                  {topEntries(summary.ticket_stats.by_type).map(([key, count]) => (
                    <li key={key} className="flex items-center justify-between">
                      <span className="capitalize">{key.replaceAll("_", " ")}</span>
                      <span className="font-medium text-zinc-900">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
              Period: {new Date(summary.period.start).toLocaleString()} -{" "}
              {new Date(summary.period.end).toLocaleString()}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
