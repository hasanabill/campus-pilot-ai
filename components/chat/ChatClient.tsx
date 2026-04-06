"use client";

import { FormEvent, useMemo, useState } from "react";

import ChatInput from "@/components/chat/ChatInput";
import ChatMessageList from "@/components/chat/ChatMessageList";
import InlineAlert from "@/components/ui/InlineAlert";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatClientProps = {
  userName?: string | null;
};

type ChatApiResponse = {
  answer: string;
  session_id: string;
};

const suggestedPrompts = [
  "What documents are needed for a transcript request?",
  "Summarize this semester's class schedule policy.",
  "How do I apply for internship permission?",
  "What is the ticket escalation workflow?",
];

export default function ChatClient({ userName }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);

  const history = useMemo(() => messages.slice(-10), [messages]);

  async function submitQuestion(rawText: string) {
    const trimmed = rawText.trim();
    if (trimmed.length < 2 || isLoading) {
      return;
    }

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setError(null);
    setLastFailedQuestion(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          session_id: sessionId,
          history,
        }),
      });

      const payload = (await response.json()) as
        | ChatApiResponse
        | {
            error?: string;
          };

      if (!response.ok || !("answer" in payload)) {
        throw new Error(
          "error" in payload && payload.error ? payload.error : "Unable to process request.",
        );
      }

      setSessionId(payload.session_id);
      setMessages((prev) => [...prev, { role: "assistant", content: payload.answer }]);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Chat request failed.";
      setError(message);
      setLastFailedQuestion(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I could not complete your request. Please try again or contact the department office.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitQuestion(question);
  }

  async function onRetryLastQuestion() {
    if (!lastFailedQuestion) return;
    await submitQuestion(lastFailedQuestion);
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-900">AI Chat Assistant</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {userName ? `Signed in as ${userName}. ` : ""}
          Ask questions about courses, policies, schedules, and notices.
        </p>
      </header>

      <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Suggested prompts
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isLoading}
              onClick={() => void submitQuestion(prompt)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <ChatMessageList messages={messages} isLoading={isLoading} />
      <ChatInput value={question} isLoading={isLoading} onChange={setQuestion} onSubmit={onSubmit} />

      {error ? <InlineAlert message={error} tone="error" /> : null}
      {lastFailedQuestion ? (
        <div className="mt-2 flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3">
          <p className="text-xs text-zinc-600">
            Last failed question: <span className="font-medium text-zinc-900">{lastFailedQuestion}</span>
          </p>
          <button
            type="button"
            onClick={() => void onRetryLastQuestion()}
            disabled={isLoading}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
