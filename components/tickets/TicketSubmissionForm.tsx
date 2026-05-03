"use client";

import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";
import StatusBadge from "@/components/ui/StatusBadge";

const ticketTypes   = ["certificate", "transcript", "correction", "permission", "internship", "other"] as const;
const priorities    = ["low", "medium", "high", "urgent"] as const;

const priorityStyle: Record<(typeof priorities)[number], string> = {
  low:    "border-zinc-200  bg-zinc-50   text-zinc-600",
  medium: "border-sky-200   bg-sky-50    text-sky-700",
  high:   "border-amber-200 bg-amber-50  text-amber-700",
  urgent: "border-red-200   bg-red-50    text-red-700",
};

export default function TicketSubmissionForm() {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [type,        setType]        = useState<(typeof ticketTypes)[number]>("certificate");
  const [priority,    setPriority]    = useState<(typeof priorities)[number]>("medium");
  const [isLoading,   setIsLoading]   = useState(false);
  const [message,     setMessage]     = useState<string | null>(null);
  const [error,       setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string }>({});

  function validate() {
    const fe: typeof fieldErrors = {};
    if (title.trim().length < 3)         fe.title       = "Title must be at least 3 characters.";
    if (title.trim().length > 200)       fe.title       = "Title must be 200 characters or less.";
    if (description.trim().length < 10)  fe.description = "Description must be at least 10 characters.";
    if (description.trim().length > 5000) fe.description = "Description must be 5000 characters or less.";
    setFieldErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), type, priority }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not submit ticket.");
      setTitle(""); setDescription(""); setType("certificate"); setPriority("medium"); setFieldErrors({});
      setMessage("Ticket submitted successfully. We'll get back to you shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ticket submission failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <form onSubmit={onSubmit} className="cp-card space-y-5">
        <div className="border-b border-zinc-100 pb-4">
          <h2 className="text-lg font-bold text-zinc-900">Submit a service request</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Use this form to request academic documents, corrections, or permissions.
          </p>
        </div>

        {message ? <InlineAlert tone="success" message={message} /> : null}
        {error   ? <InlineAlert tone="error"   message={error}   /> : null}

        {/* Title */}
        <div>
          <label htmlFor="ticket-title" className="cp-label">Request title</label>
          <input
            id="ticket-title"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (fieldErrors.title) setFieldErrors((p) => ({ ...p, title: undefined })); }}
            placeholder="e.g. Transcript request for visa application"
            className={`cp-input ${fieldErrors.title ? "border-red-300" : ""}`}
            minLength={3}
            maxLength={200}
            required
          />
          <div className="mt-1 flex justify-between text-xs text-zinc-400">
            {fieldErrors.title ? <span className="text-red-600">{fieldErrors.title}</span> : <span>Keep it short and specific.</span>}
            <span>{title.length}/200</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="ticket-desc" className="cp-label">Description</label>
          <textarea
            id="ticket-desc"
            value={description}
            onChange={(e) => { setDescription(e.target.value); if (fieldErrors.description) setFieldErrors((p) => ({ ...p, description: undefined })); }}
            placeholder="Include relevant details: student ID, course code, deadline, expected outcome…"
            className={`cp-textarea ${fieldErrors.description ? "border-red-300" : ""}`}
            minLength={10}
            maxLength={5000}
            required
          />
          <div className="mt-1 flex justify-between text-xs text-zinc-400">
            {fieldErrors.description ? <span className="text-red-600">{fieldErrors.description}</span> : <span>More context leads to faster resolution.</span>}
            <span>{description.length}/5000</span>
          </div>
        </div>

        {/* Type + Priority */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ticket-type" className="cp-label">Request type</label>
            <select id="ticket-type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className="cp-select">
              {ticketTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="cp-label">Priority</label>
            <div className="flex flex-wrap gap-1.5">
              {priorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                    priority === p ? priorityStyle[p] + " ring-2 ring-offset-1 ring-zinc-400" : priorityStyle[p] + " opacity-60 hover:opacity-100"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Current: <StatusBadge label={priority} />
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <button
            type="submit"
            disabled={isLoading || title.trim().length < 3 || description.trim().length < 10}
            className="cp-btn-primary w-full py-2.5"
          >
            {isLoading ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
