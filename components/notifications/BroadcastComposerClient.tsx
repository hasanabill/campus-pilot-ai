"use client";

import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";

export default function BroadcastComposerClient() {
  const [audience, setAudience] = useState("all");
  const [type, setType] = useState("announcement");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience, type, message }),
      });
      const payload = (await res.json()) as { created_count?: number; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Broadcast failed.");
      setNotice(`Broadcast sent to ${payload.created_count ?? 0} users.`);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Broadcast failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Notification Broadcast" subtitle="Send manual announcements or reminders to selected role audiences." />
      {notice ? <InlineAlert tone="success" message={notice} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}
      <form onSubmit={submit} className="cp-card grid gap-4 md:grid-cols-2">
        <select value={audience} onChange={(e) => setAudience(e.target.value)} className="cp-select">
          <option value="all">All users</option>
          <option value="students">Students</option>
          <option value="faculty">Faculty</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className="cp-select">
          <option value="announcement">Announcement</option>
          <option value="reminder">Reminder</option>
        </select>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="cp-textarea min-h-32 md:col-span-2" placeholder="Broadcast message..." required />
        <button type="submit" disabled={loading} className="cp-btn-primary md:col-span-2">{loading ? "Sending..." : "Send Broadcast"}</button>
      </form>
    </section>
  );
}
