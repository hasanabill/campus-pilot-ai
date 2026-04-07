"use client";

import { FormEvent, useState } from "react";

import InlineAlert from "@/components/ui/InlineAlert";

const ticketTypes = [
  "certificate",
  "transcript",
  "correction",
  "permission",
  "internship",
  "other",
] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;

export default function TicketSubmissionForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof ticketTypes)[number]>("certificate");
  const [priority, setPriority] =
    useState<(typeof priorities)[number]>("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    description?: string;
  }>({});

  function validateForm() {
    const nextErrors: { title?: string; description?: string } = {};

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 3) {
      nextErrors.title = "Title must be at least 3 characters.";
    } else if (trimmedTitle.length > 200) {
      nextErrors.title = "Title must be 200 characters or less.";
    }

    if (trimmedDescription.length < 10) {
      nextErrors.description = "Description must be at least 10 characters.";
    } else if (trimmedDescription.length > 5000) {
      nextErrors.description = "Description must be 5000 characters or less.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not submit ticket.");
      }

      setTitle("");
      setDescription("");
      setType("certificate");
      setPriority("medium");
      setFieldErrors({});
      setMessage("Ticket submitted successfully.");
    } catch (submitError) {
      const msg =
        submitError instanceof Error
          ? submitError.message
          : "Ticket submission failed.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full text-zinc-600 max-w-3xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
    >
      <h2 className="text-xl font-semibold text-zinc-900">Submit Ticket</h2>
      <p className="text-sm text-zinc-600">
        Create a new service request for academic document, correction,
        permission, or related support.
      </p>

      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-700">Title</span>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (fieldErrors.title) {
              setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }
          }}
          className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500 ${
            fieldErrors.title ? "border-red-300" : "border-zinc-300"
          }`}
          minLength={3}
          maxLength={200}
          required
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Keep it short and specific.</p>
          <p className="text-xs text-zinc-500">{title.length}/200</p>
        </div>
        {fieldErrors.title ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-700">Description</span>
        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (fieldErrors.description) {
              setFieldErrors((prev) => ({ ...prev, description: undefined }));
            }
          }}
          className={`min-h-28 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-zinc-500 ${
            fieldErrors.description ? "border-red-300" : "border-zinc-300"
          }`}
          minLength={10}
          maxLength={5000}
          required
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Include relevant context (IDs, course code, requested outcome, and
            deadline).
          </p>
          <p className="text-xs text-zinc-500">{description.length}/5000</p>
        </div>
        {fieldErrors.description ? (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
        ) : null}
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Type</span>
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as (typeof ticketTypes)[number])
            }
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
            onChange={(event) =>
              setPriority(event.target.value as (typeof priorities)[number])
            }
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
        disabled={
          isLoading || title.trim().length < 3 || description.trim().length < 10
        }
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
