import { redirect } from "next/navigation";

import ScheduleEditorForm from "@/components/schedules/ScheduleEditorForm";
import { auth } from "@/lib/auth";

export default async function AdminSchedulesPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-zinc-50 p-6">
      <ScheduleEditorForm />
    </main>
  );
}
