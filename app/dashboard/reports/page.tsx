import { redirect } from "next/navigation";

import ReportsClient from "@/components/reports/ReportsClient";
import { auth } from "@/lib/auth";

export default async function ReportsDashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "student") {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-zinc-50 p-6">
      <ReportsClient />
    </main>
  );
}
