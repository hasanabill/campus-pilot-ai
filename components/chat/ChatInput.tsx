"use client";

import { FormEvent } from "react";

type ChatInputProps = {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ChatInput({ value, isLoading, onChange, onSubmit }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask a question about courses, policies, or processes…"
        disabled={isLoading}
        className="cp-input flex-1"
      />
      <button
        type="submit"
        disabled={isLoading || value.trim().length < 2}
        className="cp-btn-primary shrink-0 px-4 py-2"
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>Sending</span>
          </span>
        ) : (
          "Send →"
        )}
      </button>
    </form>
  );
}
