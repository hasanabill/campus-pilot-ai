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
    <div className="h-full min-h-0 flex-1 overflow-y-auto px-2 py-3">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white text-xl">
              💬
            </div>
            <p className="text-sm font-semibold text-zinc-700">Ask me anything</p>
            <p className="mt-1 text-xs text-zinc-400 max-w-xs">
              I can help with course info, regulations, document processes, and more.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white text-[10px] font-bold">
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                message.role === "user"
                  ? "rounded-br-sm bg-zinc-900 text-white"
                  : "rounded-bl-sm border border-zinc-200 bg-white text-zinc-900 shadow-sm"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="flex justify-start">
            <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white text-[10px] font-bold">
              AI
            </div>
            <div className="rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
