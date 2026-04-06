import TicketSubmissionForm from "@/components/tickets/TicketSubmissionForm";
import PageHeader from "@/components/ui/PageHeader";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function TicketSubmissionPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["student"]);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <PageHeader
        title="New Ticket Request"
        subtitle="Submit a support request to your department and track updates from the ticket dashboard."
      />
      <TicketSubmissionForm />
    </main>
  );
}
