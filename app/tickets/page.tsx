import { redirect } from "next/navigation";

import TicketListClient from "@/components/tickets/TicketListClient";
import { auth } from "@/lib/auth";

export default async function TicketTrackingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-zinc-50 p-6">
      <TicketListClient />
    </main>
  );
}
