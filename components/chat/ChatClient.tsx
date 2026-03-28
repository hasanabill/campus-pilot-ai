"use client";

import { FormEvent, useMemo, useState } from "react";

import ChatInput from "@/components/chat/ChatInput";
import ChatMessageList from "@/components/chat/ChatMessageList";

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

export default function ChatClient({ userName }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = useMemo(() => messages.slice(-10), [messages]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 2 || isLoading) {
      return;
    }

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setError(null);
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

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-900">AI Chat Assistant</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {userName ? `Signed in as ${userName}. ` : ""}
          Ask questions about courses, policies, schedules, and notices.
        </p>
      </header>

      <ChatMessageList messages={messages} isLoading={isLoading} />
      <ChatInput value={question} isLoading={isLoading} onChange={setQuestion} onSubmit={onSubmit} />

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
