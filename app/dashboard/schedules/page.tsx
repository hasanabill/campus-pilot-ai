import ScheduleEditorForm from "@/components/schedules/ScheduleEditorForm";
import ScheduleManagerClient from "@/components/schedules/ScheduleManagerClient";
import { auth } from "@/lib/auth";
import { requireAnyRole, requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function AdminSchedulesPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);
  requireAnyRole(user.role, ["admin"]);

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-2 md:p-4">
      <ScheduleEditorForm />
      <ScheduleManagerClient />
    </main>
  );
}
