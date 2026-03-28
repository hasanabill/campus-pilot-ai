"use client";

import { FormEvent, useState } from "react";

const ticketTypes = ["certificate", "transcript", "correction", "permission", "internship", "other"] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;

export default function TicketSubmissionForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof ticketTypes)[number]>("certificate");
  const [priority, setPriority] = useState<(typeof priorities)[number]>("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, type, priority }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not submit ticket.");
      }

      setTitle("");
      setDescription("");
      setType("certificate");
      setPriority("medium");
      setMessage("Ticket submitted successfully.");
    } catch (submitError) {
      const msg = submitError instanceof Error ? submitError.message : "Ticket submission failed.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-xl font-semibold text-zinc-900">Submit Ticket</h2>

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-700">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          minLength={3}
          required
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-700">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-28 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          minLength={10}
          required
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as (typeof ticketTypes)[number])}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
          >
            {ticketTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Priority</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as (typeof priorities)[number])}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
          >
            {priorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isLoading ? "Submitting..." : "Submit"}
      </button>

      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
