import TicketListClient from "@/components/tickets/TicketListClient";
import PageHeader from "@/components/ui/PageHeader";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function TicketTrackingPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["student"]);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <PageHeader
        title="My Ticket Requests"
        subtitle="Track your own requests, filter by status/type, and navigate through paginated results."
      />
      <TicketListClient />
    </main>
  );
}
