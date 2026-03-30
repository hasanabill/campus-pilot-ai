import { redirect } from "next/navigation";

import ScheduleViewerClient from "@/components/schedules/ScheduleViewerClient";
import { auth } from "@/lib/auth";

export default async function SchedulesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-zinc-50 p-6">
      <ScheduleViewerClient />
    </main>
  );
}
