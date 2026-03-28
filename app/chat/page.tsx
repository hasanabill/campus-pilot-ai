import { redirect } from "next/navigation";

import ChatClient from "@/components/chat/ChatClient";
import { auth } from "@/lib/auth";

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <ChatClient userName={session.user.name} />
    </main>
  );
}
