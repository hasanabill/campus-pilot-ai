type Message = {
  role: "user" | "assistant";
  content: string;
};

type ChatMessageListProps = {
  messages: Message[];
  isLoading: boolean;
};

export default function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  return (
    <div className="h-[55vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4">
      {messages.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-600">
          <p className="font-medium text-zinc-900">Ask about:</p>
          <p className="mt-1">- course and exam information</p>
          <p>- regulations, notices, and handbook guidance</p>
          <p>- service requests and document processes</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
              message.role === "user"
                ? "ml-auto bg-zinc-900 text-white"
                : "mr-auto bg-zinc-100 text-zinc-900"
            }`}
          >
            {message.content}
          </div>
        ))}

        {isLoading ? (
          <div className="mr-auto inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500 [animation-delay:240ms]" />
            </span>
            Thinking...
          </div>
        ) : null}
      </div>
    </div>
  );
}
