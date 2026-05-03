import NoticeListClient from "@/components/notices/NoticeListClient";
import { auth } from "@/lib/auth";
import { requireAuthenticatedUser } from "@/lib/routeGuards";

export default async function NoticesPage() {
  const session = await auth();
  requireAuthenticatedUser(session);

  return (
    <main className="mx-auto max-w-6xl p-2 md:p-4">
      <NoticeListClient />
    </main>
  );
}
