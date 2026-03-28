import { redirect } from "next/navigation";

import TicketSubmissionForm from "@/components/tickets/TicketSubmissionForm";
import { auth } from "@/lib/auth";

export default async function TicketSubmissionPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl bg-zinc-50 p-6">
      <TicketSubmissionForm />
    </main>
  );
}
