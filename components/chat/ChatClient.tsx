"use client";

import { FormEvent, useMemo, useState } from "react";

import ChatInput from "@/components/chat/ChatInput";
import ChatMessageList from "@/components/chat/ChatMessageList";
import InlineAlert from "@/components/ui/InlineAlert";

type Message = { role: "user" | "assistant"; content: string };
type ChatApiResponse = {
  answer: string;
  session_id: string;
  routed_to_ticket_id?: string | null;
  source?: "faq" | "knowledge_base";
};
type ChatClientProps = { userName?: string | null };

const suggestedPrompts = [
  "What documents are needed for a transcript request?",
  "How do I apply for internship permission?",
  "Summarize this semester's schedule policy.",
  "What is the ticket escalation workflow?",
];

export default function ChatClient({ userName }: ChatClientProps) {
  const [messages,          setMessages]          = useState<Message[]>([]);
  const [question,          setQuestion]          = useState("");
  const [sessionId,         setSessionId]         = useState<string | undefined>(undefined);
  const [isLoading,         setIsLoading]         = useState(false);
  const [error,             setError]             = useState<string | null>(null);
  const [notice,            setNotice]            = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);

  const history = useMemo(() => messages.slice(-10), [messages]);

  async function submitQuestion(raw: string) {
    const trimmed = raw.trim();
    if (trimmed.length < 2 || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setError(null);
    setNotice(null);
    setLastFailedQuestion(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, session_id: sessionId, history }),
      });

      const payload = (await res.json()) as ChatApiResponse | { error?: string };

      if (!res.ok || !("answer" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "Unable to process request.");
      }

      setSessionId(payload.session_id);
      setMessages((prev) => [...prev, { role: "assistant", content: payload.answer }]);
      if (payload.source === "faq") {
        setNotice("Answered from the managed FAQ library.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat request failed.";
      setError(msg);
      setLastFailedQuestion(trimmed);
      setMessages((prev) => [...prev, { role: "assistant", content: "I couldn't complete that request. Please try again or contact the department office." }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitQuestion(question);
  }

  async function routeLastQuestionToTicket() {
    const lastQuestion = [...messages].reverse().find((message) => message.role === "user")?.content;
    if (!lastQuestion || isLoading) return;

    setIsLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: lastQuestion,
          session_id: sessionId,
          history,
          create_ticket: true,
        }),
      });
      const payload = (await res.json()) as ChatApiResponse | { error?: string };
      if (!res.ok || !("answer" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "Ticket routing failed.");
      }
      setSessionId(payload.session_id);
      setNotice(
        payload.routed_to_ticket_id
          ? `Created ticket from chat: ${payload.routed_to_ticket_id}`
          : "Chat was processed, but no ticket was created.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ticket routing failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] w-full max-w-4xl flex-col">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">AI Chat Assistant</h1>
          <p className="mt-0.5 text-xs text-zinc-400">
            {userName ? `Signed in as ${userName} · ` : ""}
            Ask about policies, schedules, documents, and processes.
          </p>
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void routeLastQuestionToTicket()}
            disabled={isLoading}
            className="cp-btn-secondary text-xs"
          >
            Create ticket from last question
          </button>
          <button
            type="button"
            onClick={() => { setMessages([]); setSessionId(undefined); setError(null); setNotice(null); }}
            className="cp-btn-secondary text-xs"
          >
            Clear chat
          </button>
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      {messages.length === 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isLoading}
              onClick={() => void submitQuestion(prompt)}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 transition"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="cp-card flex-1 min-h-0 p-0 overflow-hidden flex flex-col">
        <ChatMessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Error / retry */}
      {error && (
        <div className="mt-3">
          <InlineAlert message={error} tone="error" />
        </div>
      )}
      {notice && (
        <div className="mt-3">
          <InlineAlert message={notice} tone="success" />
        </div>
      )}
      {lastFailedQuestion && (
        <div className="mt-2 flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-sm">
          <p className="text-xs text-zinc-500 min-w-0 truncate">
            Failed: <span className="font-medium text-zinc-700">{lastFailedQuestion}</span>
          </p>
          <button
            type="button"
            onClick={() => void submitQuestion(lastFailedQuestion)}
            disabled={isLoading}
            className="cp-btn-secondary ml-2 shrink-0 text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Input */}
      <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <ChatInput value={question} isLoading={isLoading} onChange={setQuestion} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
