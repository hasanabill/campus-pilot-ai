"use client";

import { useEffect, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import MetricCard  from "@/components/ui/MetricCard";
import PageHeader  from "@/components/ui/PageHeader";

type ReportSummary = {
  period: { start: string; end: string };
  ticket_stats: { total: number; by_status: Record<string, number>; by_type: Record<string, number> };
  ai_query_stats: { total_queries: number; unique_users: number; routed_to_ticket: number; avg_confidence_score: number };
  request_completion: { completed: number; completion_rate_percent: number };
};

type BusyAction = "refresh" | "generate" | "export" | null;

function toDateValue(d: Date) { return d.toISOString().slice(0, 10); }
function toIsoStart(v?: string) { return v ? new Date(`${v}T00:00:00.000Z`).toISOString() : undefined; }
function toIsoEnd(v?: string)   { return v ? new Date(`${v}T23:59:59.999Z`).toISOString() : undefined; }
function topEntries(map: Record<string, number>, max = 4) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, max);
}

export default function ReportsClient() {
  const [summary,     setSummary]     = useState<ReportSummary | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [message,     setMessage]     = useState<string | null>(null);
  const [busyAction,  setBusyAction]  = useState<BusyAction>(null);
  const [periodStart, setPeriodStart] = useState(() => toDateValue(new Date(Date.now() - 29 * 86_400_000)));
  const [periodEnd,   setPeriodEnd]   = useState(() => toDateValue(new Date()));

  function queryString() {
    const q = new URLSearchParams();
    const s = toIsoStart(periodStart); const e = toIsoEnd(periodEnd);
    if (s) q.set("period_start", s);
    if (e) q.set("period_end",   e);
    return q.toString();
  }

  async function loadSummary(action: BusyAction = "refresh") {
    setLoading(true); setError(null); setBusyAction(action);
    try {
      const q   = queryString();
      const res = await fetch(`/api/reports/summary${q ? `?${q}` : ""}`);
      const p   = (await res.json()) as { summary?: ReportSummary; error?: string };
      if (!res.ok || !p.summary) throw new Error(p.error ?? "Failed to load report summary.");
      setSummary(p.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report summary.");
    } finally {
      setLoading(false); setBusyAction(null);
    }
  }

  async function generateSnapshot() {
    setMessage(null); setError(null); setBusyAction("generate");
    try {
      const body: Record<string, string> = {};
      const s = toIsoStart(periodStart); const e = toIsoEnd(periodEnd);
      if (s) body.period_start = s;
      if (e) body.period_end   = e;
      const res = await fetch("/api/reports/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const p   = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(p.error ?? "Failed to generate report snapshot.");
      setMessage("Report snapshot generated and stored.");
      await loadSummary(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report.");
    } finally {
      setBusyAction(null);
    }
  }

  function exportCsv() {
    setError(null); setBusyAction("export");
    const q = queryString();
    window.open(`/api/reports/export${q ? `?${q}` : ""}`, "_blank", "noopener,noreferrer");
    setMessage("CSV export started in a new tab.");
    setTimeout(() => setBusyAction(null), 500);
  }

  useEffect(() => { void loadSummary("refresh"); }, [periodStart, periodEnd]);

  return (
    <section className="space-y-5">
      <div className="cp-card space-y-5">
        <PageHeader
          title="Reports & Analytics"
          subtitle="Track metrics, generate snapshots, and export filtered summaries."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => void loadSummary("refresh")} disabled={busyAction !== null} className="cp-btn-secondary text-xs disabled:opacity-50">
                {busyAction === "refresh" ? "Refreshing…" : "Refresh"}
              </button>
              <button onClick={() => void generateSnapshot()} disabled={busyAction !== null} className="cp-btn-secondary text-xs disabled:opacity-50">
                {busyAction === "generate" ? "Generating…" : "Generate Snapshot"}
              </button>
              <button onClick={exportCsv} disabled={busyAction !== null} className="cp-btn-primary text-xs disabled:opacity-50">
                {busyAction === "export" ? "Exporting…" : "Export CSV"}
              </button>
            </div>
          }
        />

        {/* Date range filters */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="rep-start" className="cp-label">Period start</label>
            <input id="rep-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="cp-input" />
          </div>
          <div>
            <label htmlFor="rep-end" className="cp-label">Period end</label>
            <input id="rep-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="cp-input" />
          </div>
        </div>

        {error   ? <InlineAlert tone="error"   message={error}   /> : null}
        {message ? <InlineAlert tone="success" message={message} /> : null}

        {/* Skeleton */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cp-card-2 animate-pulse space-y-2">
                <div className="h-3 w-24 rounded bg-zinc-200" />
                <div className="h-8 w-14 rounded bg-zinc-200" />
              </div>
            ))}
          </div>
        ) : null}

        {/* Metrics */}
        {summary && !loading ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Tickets"     value={summary.ticket_stats.total}                       accent="sky"     hint="In selected period" />
              <MetricCard label="AI Queries"        value={summary.ai_query_stats.total_queries}            accent="indigo"  hint="Total chatbot queries" />
              <MetricCard label="Completed"         value={summary.request_completion.completed}            accent="emerald" hint="Requests resolved" />
              <MetricCard label="Completion Rate"   value={`${summary.request_completion.completion_rate_percent}%`}         hint="Completed / total" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Status breakdown */}
              <div className="cp-card-2">
                <p className="cp-section-title mb-2">Ticket status breakdown</p>
                <ul className="space-y-1.5">
                  {topEntries(summary.ticket_stats.by_status).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-zinc-700">{k.replaceAll("_", " ")}</span>
                      <span className="font-semibold tabular-nums text-zinc-900">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Type breakdown */}
              <div className="cp-card-2">
                <p className="cp-section-title mb-2">Ticket type breakdown</p>
                <ul className="space-y-1.5">
                  {topEntries(summary.ticket_stats.by_type).map(([k, v]) => (
                    <li key={k} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-zinc-700">{k.replaceAll("_", " ")}</span>
                      <span className="font-semibold tabular-nums text-zinc-900">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="cp-card-2">
              <p className="cp-section-title mb-1">Period</p>
              <p className="text-xs text-zinc-500">
                {new Date(summary.period.start).toLocaleString()} – {new Date(summary.period.end).toLocaleString()}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
