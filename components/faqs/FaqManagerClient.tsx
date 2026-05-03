"use client";

import { FormEvent, useEffect, useState } from "react";

import EmptyState from "@/components/ui/EmptyState";
import InlineAlert from "@/components/ui/InlineAlert";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";

type Faq = {
  _id: string;
  question: string;
  answer: string;
  category: string;
  is_active: boolean;
};

export default function FaqManagerClient() {
  const [items, setItems] = useState<Faq[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("general");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/faqs?limit=50");
      const payload = (await res.json()) as { faqs?: Faq[]; error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load FAQs.");
      setItems(payload.faqs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load FAQs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, category, is_active: true }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "FAQ create failed.");
      setMessage("FAQ entry saved and available to chat fallback.");
      setQuestion("");
      setAnswer("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAQ create failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader title="FAQ Management" subtitle="Maintain common answers used by the AI assistant before escalating to tickets." />
      {message ? <InlineAlert tone="success" message={message} /> : null}
      {error ? <InlineAlert tone="error" message={error} /> : null}

      <form onSubmit={submit} className="cp-card grid gap-4 md:grid-cols-2">
        <div>
          <label className="cp-label" htmlFor="faq-category">Category</label>
          <input id="faq-category" value={category} onChange={(e) => setCategory(e.target.value)} className="cp-input" required />
        </div>
        <div>
          <label className="cp-label" htmlFor="faq-question">Question</label>
          <input id="faq-question" value={question} onChange={(e) => setQuestion(e.target.value)} className="cp-input" required />
        </div>
        <div className="md:col-span-2">
          <label className="cp-label" htmlFor="faq-answer">Answer</label>
          <textarea id="faq-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} className="cp-textarea min-h-28" required />
        </div>
        <button type="submit" disabled={loading} className="cp-btn-primary md:col-span-2">{loading ? "Saving..." : "Save FAQ"}</button>
      </form>

      <div className="cp-card space-y-3">
        <p className="cp-section-title">FAQ library</p>
        {items.length === 0 ? <EmptyState title="No FAQs yet" description="Add common questions for faster assistant responses." /> : null}
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item._id} className="cp-card-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{item.question}</p>
                  <p className="mt-1 text-sm text-zinc-900">{item.answer}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge label={item.category} tone="info" />
                  <StatusBadge label={item.is_active ? "active" : "inactive"} tone={item.is_active ? "success" : "muted"} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
