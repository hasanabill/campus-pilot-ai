import ChatClient from "@/components/chat/ChatClient";
import { auth } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function ChatPage() {
  const session = await auth();
  requireAuthenticatedUser(session);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <ChatClient userName={session.user.name} />
    </main>
  );
}
