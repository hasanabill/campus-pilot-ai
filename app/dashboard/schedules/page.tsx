import ScheduleEditorForm from "@/components/schedules/ScheduleEditorForm";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function AdminSchedulesPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin"]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-zinc-50 p-6">
      <ScheduleEditorForm />
    </main>
  );
}
