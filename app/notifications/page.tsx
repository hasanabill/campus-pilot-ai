import NotificationsClient from "@/components/notifications/NotificationsClient";
import { auth } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function NotificationsPage() {
  const session = await auth();
  requireAuthenticatedUser(session);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <NotificationsClient />
    </main>
  );
}
