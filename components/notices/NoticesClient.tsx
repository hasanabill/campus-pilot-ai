"use client";

import { FormEvent, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type Notice = {
  _id: string;
  title: string;
  body: string;
  audience: "students" | "faculty" | "all";
  published_at?: string;
};

export default function NoticesClient({ defaultDepartmentId }: { defaultDepartmentId?: string | null }) {
  const [items, setItems] = useState<Notice[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Notice["audience"]>("all");
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notices?limit=20");
      const payload = (await res.json()) as { notices?: Notice[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load notices.");
      setItems(payload.notices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, audience, department_id: departmentId, broadcast: true }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Notice publish failed.");
      setMessage("Notice published and broadcast to the selected audience.");
      setTitle("");
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notice publish failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Department Notices" subtitle="Publish internal announcements to students, faculty, or everyone." />
      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      <form onSubmit={submit} className="cp-card grid gap-4 md:grid-cols-2">
        <div>
          <label className="cp-label" htmlFor="notice-title">Title</label>
          <input id="notice-title" value={title} onChange={(e) => setTitle(e.target.value)} className="cp-input" required />
        </div>
        <div>
          <label className="cp-label" htmlFor="notice-audience">Audience</label>
          <select id="notice-audience" value={audience} onChange={(e) => setAudience(e.target.value as Notice["audience"])} className="cp-select">
            <option value="all">All users</option>
            <option value="students">Students</option>
            <option value="faculty">Faculty</option>
          </select>
        </div>
        <div>
          <label className="cp-label" htmlFor="notice-dept">Department ID</label>
          <input id="notice-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="cp-input" required />
        </div>
        <div className="md:col-span-2">
          <label className="cp-label" htmlFor="notice-body">Notice body</label>
          <textarea id="notice-body" value={body} onChange={(e) => setBody(e.target.value)} className="cp-textarea min-h-32" required />
        </div>
        <button type="submit" disabled={loading} className="cp-btn-primary md:col-span-2">
          {loading ? "Publishing..." : "Publish Notice"}
        </button>
      </form>

      <div className="cp-card space-y-3">
        <p className="cp-section-title">Recent notices</p>
        {items.length === 0 ? <EmptyState title="No notices yet" description="Published notices will appear here." /> : null}
        <div className="space-y-3">
          {items.map((notice) => (
            <article key={notice._id} className="cp-card-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{notice.title}</p>
                  <p className="mt-1 text-sm text-zinc-900">{notice.body}</p>
                  <p className="mt-2 text-xs text-zinc-500">{notice.published_at ? new Date(notice.published_at).toLocaleString() : "Draft time unavailable"}</p>
                </div>
                <StatusBadge label={notice.audience} tone="info" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
