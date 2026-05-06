"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type Ticket = { _id: string; title: string; description: string; type: string; priority: string; status: string; created_at?: string };
type Message = { _id: string; sender_role: string; message: string; attachment_urls?: string[]; created_at?: string };

export default function TicketDetailClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`);
      const payload = (await res.json()) as { ticket?: Ticket; messages?: Message[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load ticket thread.");
      setTicket(payload.ticket ?? null);
      setMessages(payload.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ticket thread.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { void load(); }, [load]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft.trim() }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Message send failed.");
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message send failed.");
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={ticket?.title ?? "Ticket Thread"}
        subtitle="Conversation history and follow-up messages for this service request."
        actions={<button type="button" onClick={() => void load()} className="cp-btn-secondary text-xs">Refresh</button>}
      />
      {loading ? <InlineAlert tone="info" message="Loading ticket..." /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      {ticket ? (
        <div className="cp-card space-y-3">
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={ticket.status} />
            <StatusBadge label={ticket.priority} />
            <StatusBadge label={ticket.type} tone="info" />
          </div>
          <p className="text-sm leading-6 text-zinc-900">{ticket.description}</p>
          <p className="text-xs text-zinc-500">Created {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "recently"}</p>
        </div>
      ) : null}

      <div className="cp-card space-y-3">
        <p className="cp-section-title">Conversation</p>
        {!loading && messages.length === 0 ? <EmptyState title="No messages yet" description="Start the conversation with a follow-up message." /> : null}
        <div className="space-y-3">
          {messages.map((item) => (
            <article key={item._id} className="cp-card-2">
              <div className="flex items-center justify-between gap-3">
                <StatusBadge label={item.sender_role} tone="default" />
                <span className="text-xs text-zinc-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900">{item.message}</p>
            </article>
          ))}
        </div>

        <form onSubmit={send} className="space-y-3 border-t border-zinc-100 pt-4">
          <label htmlFor="ticket-message" className="cp-label">Add message</label>
          <textarea id="ticket-message" value={draft} onChange={(e) => setDraft(e.target.value)} className="cp-textarea min-h-28" placeholder="Write a follow-up, clarification, or status update..." />
          <button type="submit" className="cp-btn-primary w-full">Send Message</button>
        </form>
      </div>
    </section>
  );
}
