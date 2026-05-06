import TicketDetailClient from "@/components/tickets/TicketDetailClient";
import { auth } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/routeGuards";

type PageProps = { params: Promise<{ id: string }> };

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth();
  requireAuthenticatedUser(session);
  const { id } = await params;

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <TicketDetailClient ticketId={id} />
    </main>
  );
}
