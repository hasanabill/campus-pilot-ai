import ScheduleViewerClient from "@/components/schedules/ScheduleViewerClient";
import { auth } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function SchedulesPage() {
  const session = await auth();
  const user = requireAuthenticatedUser(session);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <ScheduleViewerClient role={user.role} />
    </main>
  );
}
