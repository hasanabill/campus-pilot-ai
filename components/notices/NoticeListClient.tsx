"use client";

import { useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import FilterBar from "@/components/ui/FilterBar";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type Notice = {
  _id: string;
  title: string;
  body: string;
  audience: "students" | "faculty" | "all";
  published_at?: string | null;
  expires_at?: string | null;
};

const audienceOptions = [
  { label: "All visible", value: "" },
  { label: "Everyone", value: "all" },
  { label: "Students", value: "students" },
  { label: "Faculty", value: "faculty" },
] as const;

export default function NoticeListClient() {
  const [items, setItems] = useState<Notice[]>([]);
  const [audience, setAudience] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selectedAudience = audience) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (selectedAudience) params.set("audience", selectedAudience);

      const res = await fetch(`/api/notices?${params}`);
      const payload = (await res.json()) as { notices?: Notice[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load notices.");
      setItems(payload.notices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Department Notices"
        subtitle="Read department announcements, deadlines, schedule changes, and internal updates."
        actions={<button type="button" onClick={() => void load()} className="cp-btn-secondary text-xs">Refresh</button>}
      />

      <FilterBar>
        <label htmlFor="notice-audience-filter" className="cp-label mb-0">Audience</label>
        <select
          id="notice-audience-filter"
          value={audience}
          onChange={(event) => {
            setAudience(event.target.value);
            void load(event.target.value);
          }}
          className="cp-select w-auto"
        >
          {audienceOptions.map((option) => (
            <option key={option.value || "visible"} value={option.value}>{option.label}</option>
          ))}
        </select>
      </FilterBar>

      {loading ? <InlineAlert tone="info" message="Loading notices..." /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState title="No notices available" description="New notices from the department office will appear here." />
      ) : null}

      <div className="grid gap-4">
        {items.map((notice) => (
          <article key={notice._id} className="cp-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-zinc-900">{notice.title}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-900">{notice.body}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>Published {notice.published_at ? new Date(notice.published_at).toLocaleString() : "recently"}</span>
                  {notice.expires_at ? <span>Expires {new Date(notice.expires_at).toLocaleString()}</span> : null}
                </div>
              </div>
              <StatusBadge label={notice.audience} tone="info" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
