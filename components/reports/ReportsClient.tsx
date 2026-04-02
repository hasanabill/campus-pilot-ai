"use client";

import { useEffect, useState } from "react";

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

export default function ReportsClient() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/reports/summary");
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
    }
  }

  async function generateSnapshot() {
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate report snapshot.");
      }
      setMessage("Report snapshot generated and stored.");
      await loadSummary();
    } catch (generateError) {
      const msg =
        generateError instanceof Error ? generateError.message : "Failed to generate report.";
      setError(msg);
    }
  }

  function exportCsv() {
    window.open("/api/reports/export", "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-xl font-semibold text-zinc-900">Reports & Analytics</h2>
          <button
            onClick={() => void loadSummary()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Refresh
          </button>
          <button
            onClick={() => void generateSnapshot()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100"
          >
            Generate Snapshot
          </button>
          <button
            onClick={exportCsv}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700"
          >
            Export CSV
          </button>
        </div>

        {loading ? <p className="text-sm text-zinc-600">Loading analytics...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

        {summary ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="text-sm text-zinc-600">Ticket Statistics</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">{summary.ticket_stats.total}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="text-sm text-zinc-600">AI Query Statistics</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {summary.ai_query_stats.total_queries}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="text-sm text-zinc-600">Completed Requests</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {summary.request_completion.completed}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4">
              <p className="text-sm text-zinc-600">Completion Rate</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900">
                {summary.request_completion.completion_rate_percent}%
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
